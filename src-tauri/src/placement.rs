use crate::model::{Anchor, OverlaySettings};

#[derive(Clone, Copy)]
pub struct WorkArea {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

pub fn position(
    settings: &OverlaySettings,
    area: WorkArea,
    size: (u32, u32),
    dpi: f64,
) -> (i32, i32) {
    let width = i64::from(size.0.min(area.width));
    let height = i64::from(size.1.min(area.height));
    let left = i64::from(area.x);
    let top = i64::from(area.y);
    let right = left + i64::from(area.width) - width;
    let bottom = top + i64::from(area.height) - height;
    let margin = (f64::from(settings.margin) * dpi).round() as i64;
    let x = match settings.anchor {
        Anchor::Manual => i64::from(settings.x),
        Anchor::TopLeft | Anchor::CenterLeft | Anchor::BottomLeft => left + margin,
        Anchor::TopRight | Anchor::CenterRight | Anchor::BottomRight => right - margin,
        _ => left + (right - left) / 2,
    };
    let y = match settings.anchor {
        Anchor::Manual => i64::from(settings.y),
        Anchor::TopLeft | Anchor::TopCenter | Anchor::TopRight => top + margin,
        Anchor::BottomLeft | Anchor::BottomCenter | Anchor::BottomRight => bottom - margin,
        _ => top + (bottom - top) / 2,
    };
    (x.clamp(left, right) as i32, y.clamp(top, bottom) as i32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn anchors_respect_negative_coordinates_dpi_and_work_area() {
        let area = WorkArea {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1040,
        };
        let settings = OverlaySettings {
            anchor: Anchor::BottomRight,
            margin: 20,
            ..Default::default()
        };
        assert_eq!(position(&settings, area, (900, 200), 1.5), (-930, 810));
        let settings = OverlaySettings {
            anchor: Anchor::Center,
            ..settings
        };
        assert_eq!(position(&settings, area, (900, 200), 1.5), (-1410, 420));
    }

    #[test]
    fn recovers_offscreen_positions_and_handles_oversized_overlays() {
        let area = WorkArea {
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
        };
        let settings = OverlaySettings {
            x: -1900,
            y: 9000,
            ..Default::default()
        };
        assert_eq!(position(&settings, area, (720, 108), 1.0), (0, 612));
        assert_eq!(position(&settings, area, (2000, 1500), 1.0), (0, 0));
    }
}
