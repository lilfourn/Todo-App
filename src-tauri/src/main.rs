#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    Manager, 
    Emitter,
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder, AboutMetadata},
};

#[tauri::command]
async fn sign_out(window: tauri::Window) {
    // Emit event to frontend to trigger sign out
    window.emit("sign-out", ()).unwrap();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                
                println!("===== MENU SETUP STARTING =====");
                
                // Apply native macOS vibrancy for semi-transparent blur effect
                apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::HudWindow,
                    None,
                    Some(12.0) // Corner radius
                )
                .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

                // Create custom menu items - renamed to "Preferences"
                let preferences = MenuItemBuilder::with_id("preferences", "Preferences...")
                    .accelerator("Cmd+,")
                    .build(app)?;
                println!("Created preferences menu item");
                
                let sign_out = MenuItemBuilder::with_id("sign_out", "Sign Out")
                    .build(app)?;
                println!("Created sign out menu item");

                // Build the App submenu with custom about text
                let about_metadata = AboutMetadata {
                    name: Some("Todo App".to_string()),
                    version: Some("1.0.0".to_string()),
                    short_version: Some("1.0".to_string()),
                    authors: Some(vec!["codebyfourn".to_string()]),
                    comments: Some("This is literally the most simple todo app possible, yet I like that it is all I need to track tasks on a daily basis. No bull s***".to_string()),
                    copyright: Some("Copyright © 2025 codebyfourn. All rights reserved.".to_string()),
                    license: Some("MIT License".to_string()),
                    website: Some("https://codebyfourn.com".to_string()),
                    website_label: Some("Visit our website".to_string()),
                    credits: Some("Built with Tauri and React".to_string()),
                    icon: None,
                };
                
                let app_menu = SubmenuBuilder::new(app, "Todo App")
                    .item(&PredefinedMenuItem::about(
                        app, 
                        Some("About Todo App"),
                        Some(about_metadata)
                    )?)
                    .separator()
                    .item(&preferences)
                    .separator()
                    .item(&sign_out)
                    .separator()
                    .item(&PredefinedMenuItem::services(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::hide(app, None)?)
                    .item(&PredefinedMenuItem::hide_others(app, None)?)
                    .item(&PredefinedMenuItem::show_all(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::quit(app, None)?)
                    .build()?;
                println!("Built app menu");

                // Add other menus (File, Edit, etc.)
                let file_menu = SubmenuBuilder::new(app, "File")
                    .item(&PredefinedMenuItem::close_window(app, None)?)
                    .build()?;
                println!("Built file menu");

                let edit_menu = SubmenuBuilder::new(app, "Edit")
                    .item(&PredefinedMenuItem::undo(app, None)?)
                    .item(&PredefinedMenuItem::redo(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::cut(app, None)?)
                    .item(&PredefinedMenuItem::copy(app, None)?)
                    .item(&PredefinedMenuItem::paste(app, None)?)
                    .item(&PredefinedMenuItem::select_all(app, None)?)
                    .build()?;
                println!("Built edit menu");

                let window_menu = SubmenuBuilder::new(app, "Window")
                    .item(&PredefinedMenuItem::minimize(app, None)?)
                    .item(&PredefinedMenuItem::maximize(app, None)?)
                    .build()?;
                println!("Built window menu");

                // Build the complete menu bar
                let menu = MenuBuilder::new(app)
                    .item(&app_menu)
                    .item(&file_menu)
                    .item(&edit_menu)
                    .item(&window_menu)
                    .build()?;
                println!("Built complete menu");

                app.set_menu(menu)?;
                println!("===== MENU SET SUCCESSFULLY =====");

                // Handle menu events
                app.on_menu_event(move |app, event| {
                    println!("Menu event received: {:?}", event.id());
                    match event.id().as_ref() {
                        "preferences" => {
                            println!("Preferences clicked!");
                            // Emit event to navigate to preferences
                            if let Some(window) = app.get_webview_window("main") {
                                window.emit("navigate-to-preferences", ()).ok();
                            }
                        }
                        "sign_out" => {
                            println!("Sign out clicked!");
                            // Emit event to sign out user
                            if let Some(window) = app.get_webview_window("main") {
                                window.emit("sign-out-user", ()).ok();
                            }
                        }
                        _ => {}
                    }
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sign_out])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}