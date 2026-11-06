use serde_json::{Map, Value};
const INVALID: &str = "Modalidade não disponível neste protocolo";
struct Bits<'a> {
    data: &'a [u8],
    position: usize,
    nodes: usize,
}
impl Bits<'_> {
    fn read(&mut self, count: usize) -> Result<u64, String> {
        if count > 64
            || self
                .position
                .checked_add(count)
                .is_none_or(|end| end > self.data.len() * 8)
        {
            return Err(INVALID.into());
        }
        let mut value = 0u64;
        let mut left = count;
        while left > 0 {
            let chunk = left.min(8 - self.position % 8);
            let part = (self.data[self.position / 8] as u64 >> (self.position % 8))
                & ((1u64 << chunk) - 1);
            value = (value << chunk) | part;
            self.position += chunk;
            left -= chunk;
        }
        Ok(value)
    }
    fn instance(&mut self, types: &[Value], id: usize, depth: usize) -> Result<Value, String> {
        self.nodes += 1;
        if depth > 20 || self.nodes > 8192 {
            return Err(INVALID.into());
        }
        let ty = types.get(id).ok_or(INVALID)?;
        let args = &ty[1];
        let integer = |b: &mut Self, bounds: &Value| -> Result<i64, String> {
            Ok(bounds[0].as_i64().ok_or(INVALID)?
                + b.read(bounds[1].as_u64().ok_or(INVALID)? as usize)? as i64)
        };
        match ty[0].as_str().ok_or(INVALID)? {
            "_int" => Ok(Value::from(integer(self, &args[0])?)),
            "_bool" => Ok(Value::Bool(self.read(1)? != 0)),
            "_optional" => {
                if self.read(1)? == 0 {
                    Ok(Value::Null)
                } else {
                    self.instance(types, args[0].as_u64().ok_or(INVALID)? as usize, depth + 1)
                }
            }
            "_blob" => {
                let n = integer(self, &args[0])?;
                if !(0..=65536).contains(&n) {
                    return Err(INVALID.into());
                }
                self.position = self.position.div_ceil(8) * 8;
                for _ in 0..n {
                    self.read(8)?;
                }
                Ok(Value::Null)
            }
            "_array" => {
                let n = integer(self, &args[0])?;
                if !(0..=1024).contains(&n) {
                    return Err(INVALID.into());
                }
                for _ in 0..n {
                    self.instance(types, args[1].as_u64().ok_or(INVALID)? as usize, depth + 1)?;
                }
                Ok(Value::Null)
            }
            "_struct" => {
                let mut result = Map::new();
                for field in args[0].as_array().ok_or(INVALID)? {
                    result.insert(
                        field[0].as_str().ok_or(INVALID)?.into(),
                        self.instance(
                            types,
                            field[1].as_u64().ok_or(INVALID)? as usize,
                            depth + 1,
                        )?,
                    );
                }
                Ok(Value::Object(result))
            }
            _ => Err(INVALID.into()),
        }
    }
}
pub fn queue(data: &[u8], base_build: &str) -> Result<&'static str, String> {
    if base_build != "Base98310" {
        return Err(INVALID.into());
    }
    let types: Vec<Value> =
        serde_json::from_str(include_str!("protocol98310.json")).map_err(|_| INVALID)?;
    let mut bits = Bits {
        data,
        position: 0,
        nodes: 0,
    };
    bits.instance(&types, 50, 0)?;
    bits.read(32)?;
    let cache_length = bits.read(10)? as usize;
    bits.position = bits.position.div_ceil(8) * 8;
    for _ in 0..cache_length {
        bits.read(8)?;
    }
    let options: Vec<bool> = (0..11)
        .map(|_| bits.read(1).map(|v| v != 0))
        .collect::<Result<_, _>>()?;
    if options[8] {
        return Err(INVALID.into());
    }
    Ok(if !options[5] {
        "sc2_custom_1v1"
    } else {
        "sc2_matchmade_1v1"
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn follows_protocol_bit_order_and_rejects_unknown_versions() {
        let mut bits = Bits {
            data: &[0b11010110, 0b01101101],
            position: 0,
            nodes: 0,
        };
        assert_eq!(bits.read(3).unwrap(), 6);
        assert_eq!(bits.read(8).unwrap(), 213);
        assert!(queue(&[], "Base99999").is_err());
        assert!(queue(&[], "Base98310").is_err());
    }
}
