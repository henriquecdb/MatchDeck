use serde_json::{Map, Value};
const INVALID: &str = "Dados do replay inválidos";
pub fn decode(data: &[u8]) -> Result<Value, String> {
    let mut decoder = Decoder {
        data,
        pos: 0,
        nodes: 0,
    };
    decoder.value(0)
}
struct Decoder<'a> {
    data: &'a [u8],
    pos: usize,
    nodes: usize,
}
impl Decoder<'_> {
    fn bytes(&mut self, n: usize) -> Result<&[u8], String> {
        let end = self.pos.checked_add(n).ok_or(INVALID)?;
        let data = self.data.get(self.pos..end).ok_or(INVALID)?;
        self.pos = end;
        Ok(data)
    }
    fn byte(&mut self) -> Result<u8, String> {
        Ok(self.bytes(1)?[0])
    }
    fn integer(&mut self) -> Result<i64, String> {
        let first = self.byte()?;
        let mut value = ((first >> 1) & 63) as u64;
        let mut more = first & 128 != 0;
        let mut shift = 6;
        while more {
            if shift > 55 {
                return Err(INVALID.into());
            }
            let byte = self.byte()?;
            value |= ((byte & 127) as u64) << shift;
            more = byte & 128 != 0;
            shift += 7;
        }
        Ok(if first & 1 != 0 {
            -(value as i64)
        } else {
            value as i64
        })
    }
    fn length(&mut self) -> Result<usize, String> {
        let n = self.integer()?;
        if !(0..=65536).contains(&n) {
            return Err(INVALID.into());
        }
        Ok(n as usize)
    }
    fn value(&mut self, depth: usize) -> Result<Value, String> {
        self.nodes += 1;
        if depth > 20 || self.nodes > 8192 {
            return Err(INVALID.into());
        }
        match self.byte()? {
            0 => {
                let n = self.length()?;
                if n > 1024 {
                    return Err(INVALID.into());
                }
                (0..n)
                    .map(|_| self.value(depth + 1))
                    .collect::<Result<Vec<_>, _>>()
                    .map(Value::Array)
            }
            1 => {
                let n = self.length()?.div_ceil(8);
                self.bytes(n)?;
                Ok(Value::Null)
            }
            2 => {
                let n = self.length()?;
                Ok(Value::String(
                    String::from_utf8_lossy(self.bytes(n)?).into_owned(),
                ))
            }
            3 => {
                self.integer()?;
                self.value(depth + 1)
            }
            4 => {
                if self.byte()? == 0 {
                    Ok(Value::Null)
                } else {
                    self.value(depth + 1)
                }
            }
            5 => {
                let n = self.length()?;
                if n > 1024 {
                    return Err(INVALID.into());
                }
                let mut fields = Map::new();
                for _ in 0..n {
                    let key = self.integer()?.to_string();
                    fields.insert(key, self.value(depth + 1)?);
                }
                Ok(Value::Object(fields))
            }
            6 => Ok(Value::from(self.byte()?)),
            7 => Ok(Value::from(u32::from_le_bytes(
                self.bytes(4)?.try_into().map_err(|_| INVALID)?,
            ))),
            8 => {
                self.bytes(8)?;
                Ok(Value::Null)
            }
            9 => Ok(Value::from(self.integer()?)),
            _ => Err(INVALID.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_truncated_arrays_and_excessive_nesting() {
        assert!(decode(&[0, 128]).is_err());
        assert!(decode(&[5, 2, 0]).is_err());
        let mut nested = vec![];
        for _ in 0..25 {
            nested.extend([0, 2]);
        }
        nested.extend([6, 1]);
        assert!(decode(&nested).is_err());
        for length in 0..256 {
            let data: Vec<u8> = (0..length)
                .map(|i| ((i * 37 + length * 11) % 256) as u8)
                .collect();
            let _ = decode(&data);
        }
    }
}
