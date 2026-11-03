#[cfg(windows)]
pub fn set_native_visibility(
    handle: windows_sys::Win32::Foundation::HWND,
    visible: bool,
) -> Result<(), String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        IsWindow, ShowWindow, SW_HIDE, SW_SHOWNOACTIVATE,
    };
    unsafe {
        if IsWindow(handle) == 0 {
            return Err("Janela do overlay indisponível".into());
        }
        ShowWindow(handle, if visible { SW_SHOWNOACTIVATE } else { SW_HIDE });
    }
    Ok(())
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, GetForegroundWindow, IsWindowVisible, WS_EX_NOACTIVATE,
        WS_EX_TOOLWINDOW, WS_POPUP,
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
    fn native_show_hide_cycles_work_without_activating_or_using_framework_cache() {
        let class: Vec<u16> = "STATIC\0".encode_utf16().collect();
        let window = TestWindow(unsafe {
            CreateWindowExW(
                WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
                class.as_ptr(),
                std::ptr::null(),
                WS_POPUP,
                -32000,
                -32000,
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
            assert_ne!(unsafe { GetForegroundWindow() }, window.0);
            set_native_visibility(window.0, false).unwrap();
            assert_eq!(unsafe { IsWindowVisible(window.0) }, 0);
        }
    }
}
