use tauri::{Emitter, State, Window};
use tokio::sync::mpsc;

use crate::types::{Run, RunDetail, RunType};
use crate::AppState;

#[tauri::command]
pub async fn start_build(
    workspace_id: String,
    window: Window,
    state: State<'_, AppState>,
) -> Result<Run, String> {
    // Get workspace path
    let workspace = state
        .workspace_service
        .get_workspace(&workspace_id)
        .await
        .map_err(|e| e.to_string())?;

    // Create channel for output streaming
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // Spawn task to emit output events
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(line) = rx.recv().await {
            let _ = window_clone.emit("run-output", line);
        }
    });

    state
        .run_service
        .start_build(&workspace_id, &workspace.path, tx)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_test(
    workspace_id: String,
    window: Window,
    state: State<'_, AppState>,
) -> Result<Run, String> {
    // Get workspace path
    let workspace = state
        .workspace_service
        .get_workspace(&workspace_id)
        .await
        .map_err(|e| e.to_string())?;

    // Create channel for output streaming
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // Spawn task to emit output events
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(line) = rx.recv().await {
            let _ = window_clone.emit("run-output", line);
        }
    });

    state
        .run_service
        .start_test(&workspace_id, &workspace.path, tx)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_deploy(
    workspace_id: String,
    script_path: String,
    window: Window,
    state: State<'_, AppState>,
) -> Result<Run, String> {
    // Get workspace path
    let workspace = state
        .workspace_service
        .get_workspace(&workspace_id)
        .await
        .map_err(|e| e.to_string())?;

    // Create channel for output streaming
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // Spawn task to emit output events
    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(line) = rx.recv().await {
            let _ = window_clone.emit("run-output", line);
        }
    });

    state
        .run_service
        .start_deploy(&workspace_id, &workspace.path, &script_path, tx)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_run(run_id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .run_service
        .cancel_run(&run_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_runs(
    workspace_id: String,
    run_type: Option<RunType>,
    state: State<'_, AppState>,
) -> Result<Vec<Run>, String> {
    state
        .run_service
        .list_runs(&workspace_id, run_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_run_detail(
    run_id: String,
    state: State<'_, AppState>,
) -> Result<RunDetail, String> {
    let run = state
        .run_service
        .get_run(&run_id)
        .await
        .map_err(|e| e.to_string())?;

    let output = state
        .run_service
        .get_run_logs(&run_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(RunDetail { run, output })
}
