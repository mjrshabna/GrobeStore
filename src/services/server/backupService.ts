import { google } from 'googleapis';
import { Readable } from 'stream';

export const uploadToDrive = async (
  data: any,
  fileName: string,
  config: { clientId: string; clientSecret: string; refreshToken: string; folderId: string }
) => {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata = {
    name: fileName,
    parents: [config.folderId],
  };

  const media = {
    mimeType: 'application/json',
    body: Readable.from([JSON.stringify(data)]),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
  });

  return response.data.id;
};
