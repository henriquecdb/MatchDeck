#[cfg(windows)]
pub fn game_is_foreground(
    overlay: &tauri::WebviewWindow,
    allow_overlay: bool,
    game_id: &str,
) -> bool {
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId},
    };
    unsafe {
        let foreground = GetForegroundWindow();
        if foreground.is_null() {
            return false;
        }
        if allow_overlay && overlay.hwnd().is_ok_and(|window| window.0 == foreground) {
            return true;
        }
        let mut process_id = 0;
        GetWindowThreadProcessId(foreground, &mut process_id);
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
        if process.is_null() {
            return false;
        }
        let mut path = [0u16; 32768];
        let mut length = path.len() as u32;
        let success = QueryFullProcessImageNameW(process, 0, path.as_mut_ptr(), &mut length);
        CloseHandle(process);
        if success == 0 {
            return false;
        }
        let path = String::from_utf16_lossy(&path[..length as usize]);
        if game_id == "aoe4" {
            is_aoe4_executable(&path)
        } else {
            is_aoe2_executable(&path)
        }
    }
}

#[cfg(not(windows))]
pub fn game_is_foreground(_: &tauri::WebviewWindow, _: bool, _: &str) -> bool {
    false
}

#[cfg(any(windows, test))]
fn is_aoe2_executable(path: &str) -> bool {
    path.rsplit(['\\', '/']).next().is_some_and(|name| {
        name.eq_ignore_ascii_case("AoE2DE_s.exe") || name.eq_ignore_ascii_case("AoE2DE.exe")
    })
}

#[cfg(any(windows, test))]
fn is_aoe4_executable(path: &str) -> bool {
    path.rsplit(['\\', '/']).next().is_some_and(|name| {
        name.eq_ignore_ascii_case("RelicCardinal.exe")
            || name.eq_ignore_ascii_case("RelicCardinal_ws.exe")
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn matches_executable_name_instead_of_window_title() {
        assert!(is_aoe2_executable(r"C:\Games\AOE2DE_S.EXE"));
        assert!(!is_aoe2_executable(r"C:\Games\AoE2DE_s.exe.backup"));
        assert!(!is_aoe2_executable("MatchDeck.exe"));
        assert!(is_aoe4_executable(r"C:\Games\RelicCardinal.exe"));
        assert!(is_aoe4_executable(r"C:\Games\RELICCARDINAL_WS.EXE"));
        assert!(!is_aoe4_executable(r"C:\Games\RelicCardinal.exe.bak"));
        assert!(!is_aoe4_executable(r"C:\Games\AoE2DE.exe"));
    }
}
