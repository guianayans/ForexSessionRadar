#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io;
use std::path::PathBuf;
use std::process::Command;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        return Ok(());
      }

      let app_data_dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Diretorio de dados nao encontrado"))?;

      std::fs::create_dir_all(&app_data_dir)?;

      let current_exe = std::env::current_exe()?;
      let sidecar_path = current_exe
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Diretorio do executavel nao encontrado"))?
        .join("forex-backend");
      let data_dir = app_data_dir.to_string_lossy().to_string();
      let resource_dir = app
        .path_resolver()
        .resource_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Diretorio de recursos nao encontrado"))?;

      let web_candidates = [
        resource_dir.join("_up_/frontend/dist"),
        resource_dir.join("frontend/dist"),
        resource_dir.join("dist"),
      ];

      let web_dir: PathBuf = web_candidates
        .into_iter()
        .find(|candidate| candidate.join("index.html").exists())
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Frontend dist nao encontrado nos recursos"))?;
      let web_dir = web_dir.to_string_lossy().to_string();

      let mut sidecar = Command::new(sidecar_path);
      sidecar.args(["--host", "0.0.0.0", "--port", "4783", "--data-dir", &data_dir, "--web-dir", &web_dir]);

      if let Ok(mock_now) = std::env::var("FOREX_MOCK_NOW") {
        if !mock_now.trim().is_empty() {
          sidecar.args(["--mock-now", &mock_now]);
        }
      }

      sidecar.spawn()?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
