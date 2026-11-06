#[cfg(windows)]
pub fn set_native_visibility(
    handle: windows_sys::Win32::Foundation::HWND,
    visible: bool,
) -> Result<(), String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        IsWindow, SetWindowPos, ShowWindow, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        SW_HIDE, SW_SHOWNOACTIVATE,
    };
    unsafe {
        if IsWindow(handle) == 0 {
            return Err("Janela do overlay indisponível".into());
        }
        if visible {
            ShowWindow(handle, SW_SHOWNOACTIVATE);
            if SetWindowPos(
                handle,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            ) == 0
            {
                return Err(std::io::Error::last_os_error().to_string());
            }
        } else {
            ShowWindow(handle, SW_HIDE);
        }
    }
    Ok(())
}

#[cfg(windows)]
pub fn is_topmost(handle: windows_sys::Win32::Foundation::HWND) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, GWL_EXSTYLE, WS_EX_TOPMOST,
    };
    unsafe { GetWindowLongPtrW(handle, GWL_EXSTYLE) & WS_EX_TOPMOST as isize != 0 }
}

#[cfg(windows)]
pub fn is_above_foreground(handle: windows_sys::Win32::Foundation::HWND) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    is_above_window(handle, unsafe { GetForegroundWindow() })
}

#[cfg(windows)]
fn is_above_window(
    handle: windows_sys::Win32::Foundation::HWND,
    mut current: windows_sys::Win32::Foundation::HWND,
) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetWindow, GW_HWNDPREV};
    if current.is_null() || current == handle {
        return true;
    }
    for _ in 0..256 {
        current = unsafe { GetWindow(current, GW_HWNDPREV) };
        if current == handle {
            return true;
        }
        if current.is_null() {
            return false;
        }
    }
    false
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, GetForegroundWindow, IsWindowVisible, SetWindowPos,
        HWND_NOTOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
        WS_POPUP,
    };

    struct TestWindow(windows_sys::Win32::Foundation::HWND);
    impl Drop for TestWindow {
        fn drop(&mut self) {
            unsafe {
                DestroyWindow(self.0);
            }
        }
    }

    #[test]
    fn detects_a_topmost_window_covered_by_another_window() {
        let class: Vec<u16> = "STATIC\0".encode_utf16().collect();
        let create = || {
            TestWindow(unsafe {
                CreateWindowExW(
                    WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
                    class.as_ptr(),
                    std::ptr::null(),
                    WS_POPUP,
                    -10000,
                    -10000,
                    1,
                    1,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null(),
                )
            })
        };
        let overlay = create();
        let game = create();
        assert!(!overlay.0.is_null() && !game.0.is_null());
        set_native_visibility(overlay.0, true).unwrap();
        set_native_visibility(game.0, true).unwrap();
        assert!(is_above_window(game.0, overlay.0));
        assert!(!is_above_window(overlay.0, game.0));
        set_native_visibility(overlay.0, true).unwrap();
        assert!(is_above_window(overlay.0, game.0));
        assert!(!is_above_window(game.0, overlay.0));
    }

    #[test]
    fn native_show_hide_cycles_work_without_activating_or_using_framework_cache() {
        let class: Vec<u16> = "STATIC\0".encode_utf16().collect();
        let window = TestWindow(unsafe {
            CreateWindowExW(
                WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
                class.as_ptr(),
                std::ptr::null(),
                WS_POPUP,
                -10000,
                -10000,
                1,
                1,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null(),
            )
        });
        assert!(!window.0.is_null());
        for _ in 0..3 {
            set_native_visibility(window.0, true).unwrap();
            assert_ne!(unsafe { IsWindowVisible(window.0) }, 0);
            assert!(is_topmost(window.0));
            assert_ne!(unsafe { GetForegroundWindow() }, window.0);
            assert_ne!(
                unsafe {
                    SetWindowPos(
                        window.0,
                        HWND_NOTOPMOST,
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                    )
                },
                0
            );
            assert!(!is_topmost(window.0));
            set_native_visibility(window.0, true).unwrap();
            assert!(is_topmost(window.0));
            assert_ne!(unsafe { GetForegroundWindow() }, window.0);
            set_native_visibility(window.0, false).unwrap();
            assert_eq!(unsafe { IsWindowVisible(window.0) }, 0);
        }
    }
}
