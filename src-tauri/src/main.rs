#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    Manager, 
    Emitter,
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder, AboutMetadata},
};

// Allowed menu event IDs for input validation
const ALLOWED_MENU_IDS: &[&str] = &["preferences", "sign_out"];

/// Validates that a menu event ID is in the allowlist
/// This prevents processing of unexpected or malicious menu IDs
fn is_valid_menu_id(id: &str) -> bool {
    ALLOWED_MENU_IDS.contains(&id)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            let window = app.get_webview_window("main").unwrap();
            
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                
                #[cfg(debug_assertions)]
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
                #[cfg(debug_assertions)]
                println!("Created preferences menu item");
                
                let sign_out = MenuItemBuilder::with_id("sign_out", "Sign Out")
                    .build(app)?;
                #[cfg(debug_assertions)]
                println!("Created sign out menu item");

                // Build the App submenu with custom about text
                let about_metadata = AboutMetadata {
                    name: Some("Todo App".to_string()),
                    version: Some("1.0.0".to_string()),
                    short_version: Some("1.0".to_string()),
                    authors: Some(vec!["codebyfourn".to_string()]),
                    comments: Some("No B.S. todo app and this is all you need to manage daily tasks.\n\nCompletely free and no, I will not sell your data.\n\nThis is just a project I made to hopefully be hired somewhere :)\n\nContact: lukefournierdev@gmail.com".to_string()),
                    copyright: Some("Copyright © 2025 codebyfourn. All rights reserved.".to_string()),
                    website: Some("https://github.com/lilfourn".to_string()),
                    website_label: Some("View GitHub Profile".to_string()),
                    icon: None,
                    ..Default::default()
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
                #[cfg(debug_assertions)]
                println!("Built app menu");

                // Add other menus (File, Edit, etc.)
                let file_menu = SubmenuBuilder::new(app, "File")
                    .item(&PredefinedMenuItem::close_window(app, None)?)
                    .build()?;
                #[cfg(debug_assertions)]
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
                #[cfg(debug_assertions)]
                println!("Built edit menu");

                let window_menu = SubmenuBuilder::new(app, "Window")
                    .item(&PredefinedMenuItem::minimize(app, None)?)
                    .item(&PredefinedMenuItem::maximize(app, None)?)
                    .build()?;
                #[cfg(debug_assertions)]
                println!("Built window menu");

                // Build the complete menu bar
                let menu = MenuBuilder::new(app)
                    .item(&app_menu)
                    .item(&file_menu)
                    .item(&edit_menu)
                    .item(&window_menu)
                    .build()?;
                #[cfg(debug_assertions)]
                println!("Built complete menu");

                app.set_menu(menu)?;
                #[cfg(debug_assertions)]
                println!("===== MENU SET SUCCESSFULLY =====");

                // Handle menu events with input validation
                app.on_menu_event(move |app, event| {
                    #[cfg(debug_assertions)]
                    println!("Menu event received: {:?}", event.id());
                    
                    // Layer 1: Validate event ID against allowlist
                    let event_id = event.id().as_ref();
                    if !is_valid_menu_id(event_id) {
                        #[cfg(debug_assertions)]
                        println!("Invalid menu ID rejected: {:?}", event_id);
                        return;
                    }
                    
                    match event_id {
                        "preferences" => {
                            #[cfg(debug_assertions)]
                            println!("Preferences clicked!");
                            // Emit event to navigate to preferences
                            if let Some(window) = app.get_webview_window("main") {
                                // Validate window label before emitting
                                if window.label() != "main" {
                                    #[cfg(debug_assertions)]
                                    println!("Event rejected: window label is not 'main'");
                                    return;
                                }
                                window.emit("navigate-to-preferences", ()).unwrap_or_else(|_e| {
                                    #[cfg(debug_assertions)]
                                    eprintln!("Failed to emit navigate-to-preferences event: {:?}", _e);
                                });
                            }
                        }
                        "sign_out" => {
                            #[cfg(debug_assertions)]
                            println!("Sign out clicked!");
                            // Emit event to sign out user
                            if let Some(window) = app.get_webview_window("main") {
                                // Validate window label before emitting
                                if window.label() != "main" {
                                    #[cfg(debug_assertions)]
                                    println!("Event rejected: window label is not 'main'");
                                    return;
                                }
                                window.emit("sign-out-user", ()).unwrap_or_else(|_e| {
                                    #[cfg(debug_assertions)]
                                    eprintln!("Failed to emit sign-out-user event: {:?}", _e);
                                });
                            }
                        }
                        _ => {}
                    }
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}