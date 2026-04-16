// src/sharing/driveBackup.js
// Phase 5: Google Drive backup via REST API
// Uses expo-auth-session for OAuth2 + Google Drive REST API

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as FileSystem from 'expo-file-system';
import { exportAllPosts } from '../storage/db';

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_NAME = 'Chronicle Backups';

// ── AUTH ──────────────────────────────────────────────────

export async function signInWithGoogle(clientId) {
  if (!clientId) {
    throw new Error(
      'Google OAuth Client ID required.\n\n' +
      'Setup steps:\n' +
      '1. Go to console.cloud.google.com\n' +
      '2. Create a project → Enable Google Drive API\n' +
      '3. Create OAuth 2.0 credentials (Android)\n' +
      '4. Paste your Client ID in Settings → Google Drive'
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
  });

  const result = await request.promptAsync(DISCOVERY);

  if (result.type === 'success') {
    return {
      accessToken: result.params.access_token,
      expiresIn: result.params.expires_in,
      obtainedAt: Date.now(),
    };
  }

  throw new Error('Google Sign-In cancelled or failed.');
}

// ── DRIVE HELPERS ─────────────────────────────────────────

async function findOrCreateFolder(accessToken) {
  // Search for existing folder
  const searchRes = await fetch(
    `${DRIVE_FILES_URL}?q=name%3D'${encodeURIComponent(FOLDER_NAME)}'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id%2Cname)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const folder = await createRes.json();
  return folder.id;
}

async function uploadFileToDrive(accessToken, folderId, fileName, content, mimeType = 'application/json') {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const boundary = '-------chronicle_boundary_42';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Drive upload failed (${res.status})`);
  }

  return await res.json();
}

// ── PUBLIC API ────────────────────────────────────────────

export async function backupToDrive(accessToken) {
  const posts = await exportAllPosts();
  const backup = {
    app: 'Chronicle',
    version: '1.0',
    exported_at: new Date().toISOString(),
    post_count: posts.length,
    posts,
  };

  const json = JSON.stringify(backup, null, 2);
  const fileName = `chronicle-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const folderId = await findOrCreateFolder(accessToken);
  const file = await uploadFileToDrive(accessToken, folderId, fileName, json);

  return {
    fileId: file.id,
    fileName,
    folderId,
    postCount: posts.length,
    url: `https://drive.google.com/file/d/${file.id}/view`,
  };
}

export async function listDriveBackups(accessToken) {
  const folderId = await findOrCreateFolder(accessToken);
  const res = await fetch(
    `${DRIVE_FILES_URL}?q='${folderId}'%20in%20parents%20and%20trashed%3Dfalse&fields=files(id%2Cname%2CcreatedTime%2Csize)&orderBy=createdTime%20desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return data.files || [];
}

export async function downloadDriveBackup(accessToken, fileId) {
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to download backup (${res.status})`);
  return await res.json();
}
