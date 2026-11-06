use std::io::Read;

const LIMIT: usize = 1024 * 1024;
const INVALID: &str = "Replay SC2 inválido ou formato não suportado";
fn u32_at(data: &[u8], offset: usize) -> Result<u32, String> {
    Ok(u32::from_le_bytes(
        data.get(offset..offset + 4)
            .ok_or(INVALID)?
            .try_into()
            .map_err(|_| INVALID)?,
    ))
}
fn slice(data: &[u8], offset: usize, length: usize) -> Result<&[u8], String> {
    data.get(offset..offset.checked_add(length).ok_or(INVALID)?)
        .ok_or_else(|| INVALID.into())
}
fn table() -> [u32; 1280] {
    let mut output = [0; 1280];
    let mut seed = 0x100001u32;
    for i in 0..256 {
        for j in 0..5 {
            seed = (seed * 125 + 3) % 0x2aaaab;
            let high = (seed & 65535) << 16;
            seed = (seed * 125 + 3) % 0x2aaaab;
            output[i + j * 256] = high | (seed & 65535);
        }
    }
    output
}
fn hash(name: &str, kind: usize, table: &[u32; 1280]) -> u32 {
    let (mut a, mut b) = (0x7fed7fedu32, 0xeeeeeeeeu32);
    for byte in name.bytes().map(|b| b.to_ascii_uppercase()) {
        a = table[kind * 256 + byte as usize] ^ a.wrapping_add(b);
        b = (byte as u32)
            .wrapping_add(a)
            .wrapping_add(b)
            .wrapping_add(b << 5)
            .wrapping_add(3);
    }
    a
}
fn decrypt(data: &[u8], mut key: u32, table: &[u32; 1280]) -> Vec<u8> {
    let mut output = Vec::with_capacity(data.len());
    let mut seed = 0xeeeeeeeeu32;
    for bytes in data.as_chunks::<4>().0 {
        seed = seed.wrapping_add(table[1024 + (key & 255) as usize]);
        let value = u32::from_le_bytes(*bytes) ^ key.wrapping_add(seed);
        output.extend_from_slice(&value.to_le_bytes());
        key = ((!key << 21).wrapping_add(0x11111111)) | (key >> 11);
        seed = value
            .wrapping_add(seed)
            .wrapping_add(seed << 5)
            .wrapping_add(3);
    }
    output
}
fn unpack(data: &[u8], expected: usize) -> Result<Vec<u8>, String> {
    if expected > LIMIT {
        return Err(INVALID.into());
    }
    if data.len() == expected {
        return Ok(data.to_vec());
    }
    let (&method, compressed) = data.split_first().ok_or(INVALID)?;
    let decoder: Box<dyn Read + '_> = match method {
        2 => Box::new(flate2::read::ZlibDecoder::new(compressed)),
        16 => Box::new(bzip2::read::BzDecoder::new(compressed)),
        _ => return Err(INVALID.into()),
    };
    let mut output = Vec::new();
    decoder
        .take((expected + 1) as u64)
        .read_to_end(&mut output)
        .map_err(|_| INVALID)?;
    if output.len() != expected {
        return Err(INVALID.into());
    }
    Ok(output)
}
pub struct Archive<'a> {
    data: &'a [u8],
    base: usize,
    hashes: Vec<u8>,
    blocks: Vec<u8>,
    sector: usize,
    crypt: [u32; 1280],
}
impl<'a> Archive<'a> {
    pub fn new(data: &'a [u8]) -> Result<Self, String> {
        if data.len() > 16 * LIMIT || !data.starts_with(b"MPQ\x1b") {
            return Err(INVALID.into());
        }
        let base = u32_at(data, 8)? as usize;
        let header = slice(data, base, 32)?;
        if !header.starts_with(b"MPQ\x1a")
            || header[12] > 3
            || header[13] != 0
            || header[15] != 0
            || header[14] > 7
        {
            return Err(INVALID.into());
        }
        let crypt = table();
        let read_table = |offset, count, name| -> Result<Vec<u8>, String> {
            let count = u32_at(header, count)? as usize;
            if count == 0 || count > 4096 {
                return Err(INVALID.into());
            }
            let start = base
                .checked_add(u32_at(header, offset)? as usize)
                .ok_or(INVALID)?;
            Ok(decrypt(
                slice(data, start, count * 16)?,
                hash(name, 3, &crypt),
                &crypt,
            ))
        };
        Ok(Self {
            data,
            base,
            hashes: read_table(16, 24, "(hash table)")?,
            blocks: read_table(20, 28, "(block table)")?,
            sector: 512 << header[14],
            crypt,
        })
    }
    pub fn read(&self, name: &str) -> Result<Vec<u8>, String> {
        let hash_a = hash(name, 1, &self.crypt);
        let hash_b = hash(name, 2, &self.crypt);
        let entry = self
            .hashes
            .as_chunks::<16>()
            .0
            .iter()
            .find(|e| u32_at(*e, 0).ok() == Some(hash_a) && u32_at(*e, 4).ok() == Some(hash_b))
            .ok_or(INVALID)?;
        let block = slice(
            &self.blocks,
            (u32_at(entry, 12)? as usize)
                .checked_mul(16)
                .ok_or(INVALID)?,
            16,
        )?;
        let size = u32_at(block, 8)? as usize;
        let flags = u32_at(block, 12)?;
        if size > LIMIT || flags & 0x10000 != 0 || flags & 0x80000000 == 0 {
            return Err(INVALID.into());
        }
        let raw = slice(
            self.data,
            self.base
                .checked_add(u32_at(block, 0)? as usize)
                .ok_or(INVALID)?,
            u32_at(block, 4)? as usize,
        )?;
        if flags & 0x01000000 != 0 {
            return unpack(raw, size);
        }
        if flags & 0x200 == 0 {
            return if raw.len() == size {
                Ok(raw.to_vec())
            } else {
                Err(INVALID.into())
            };
        }
        let count = size.div_ceil(self.sector);
        let offsets = slice(raw, 0, (count + 1) * 4)?;
        let mut output = Vec::with_capacity(size);
        for i in 0..count {
            let start = u32_at(offsets, i * 4)? as usize;
            let end = u32_at(offsets, (i + 1) * 4)? as usize;
            if start < offsets.len() || end < start {
                return Err(INVALID.into());
            }
            output.extend(unpack(
                slice(raw, start, end - start)?,
                self.sector.min(size - output.len()),
            )?);
        }
        Ok(output)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_truncated_and_oversized_archives_and_decompression_bombs() {
        for size in 0..64 {
            assert!(Archive::new(&vec![0; size]).is_err());
        }
        assert!(Archive::new(&vec![0; 16 * LIMIT + 1]).is_err());
        assert!(unpack(&[2, 1, 2], LIMIT + 1).is_err());
        assert!(unpack(&[99, 1], 20).is_err());
    }
}
