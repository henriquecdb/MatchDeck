use crate::{
    model::{Anchor, OverlaySettings},
    placement::{self, WorkArea},
};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayMonitor {
    id: String,
    name: String,
    width: u32,
    height: u32,
    scale_factor: f64,
}

fn id(monitor: &tauri::Monitor) -> String {
    monitor
        .name()
        .cloned()
        .unwrap_or_else(|| format!("{}:{}", monitor.position().x, monitor.position().y))
}

pub fn list(window: &tauri::WebviewWindow) -> Result<Vec<DisplayMonitor>, String> {
    Ok(window
        .available_monitors()
        .map_err(|error| error.to_string())?
        .iter()
        .enumerate()
        .map(|(index, monitor)| DisplayMonitor {
            id: id(monitor),
            name: format!(
                "Monitor {} · {} × {}",
                index + 1,
                monitor.size().width,
                monitor.size().height
            ),
            width: monitor.size().width,
            height: monitor.size().height,
            scale_factor: monitor.scale_factor(),
        })
        .collect())
}

pub fn apply(
    window: &tauri::WebviewWindow,
    settings: &OverlaySettings,
    logical_size: (f64, f64),
) -> Result<(), String> {
    let monitors = window
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let selected = monitors.iter().find(|monitor| {
        settings
            .monitor_id
            .as_ref()
            .is_some_and(|selected| selected == &id(monitor))
    });
    let containing = monitors.iter().find(|monitor| {
        let area = monitor.work_area();
        settings.x >= area.position.x
            && settings.y >= area.position.y
            && i64::from(settings.x) < i64::from(area.position.x) + i64::from(area.size.width)
            && i64::from(settings.y) < i64::from(area.position.y) + i64::from(area.size.height)
    });
    let primary = window
        .primary_monitor()
        .map_err(|error| error.to_string())?;
    let monitor = selected
        .or_else(|| {
            if settings.monitor_id.is_none() && settings.anchor == Anchor::Manual {
                containing
            } else {
                None
            }
        })
        .or(primary.as_ref())
        .or(monitors.first())
        .ok_or("Nenhum monitor disponível")?;
    let area = monitor.work_area();
    let dpi = monitor.scale_factor();
    let width = ((logical_size.0 * settings.scale * dpi).ceil() as u32).min(area.size.width);
    let height = ((logical_size.1 * settings.scale * dpi).ceil() as u32).min(area.size.height);
    let (x, y) = placement::position(
        settings,
        WorkArea {
            x: area.position.x,
            y: area.position.y,
            width: area.size.width,
            height: area.size.height,
        },
        (width, height),
        dpi,
    );
    if window.outer_position().map_err(|error| error.to_string())?
        != tauri::PhysicalPosition::new(x, y)
    {
        window
            .set_position(tauri::PhysicalPosition::new(x, y))
            .map_err(|error| error.to_string())?;
    }
    if window.inner_size().map_err(|error| error.to_string())?
        != tauri::PhysicalSize::new(width, height)
    {
        window
            .set_size(tauri::PhysicalSize::new(width, height))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}
