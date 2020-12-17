import { Handler } from 'aws-lambda';
import { env } from 'process';
import { S3 } from 'aws-sdk';
import { join } from 'path';
import { tmpdir } from 'os';
import { launch, Browser } from 'puppeteer';
import { nanoid } from 'nanoid';
import { ensureDir } from 'fs-extra';

import 'source-map-support/register';

const { S3_REGION, S3_BUCKET_NAME } = env;

interface Request {
  url?: string;
}

interface Response {
  url: string;
  signedUrl: string;
}

const printPdf = async (url: string): Promise<Response> => {
  let browser: Browser | null = null;
  try {
    // Puppeteer立ち上げ
    browser = await launch({
      executablePath: '/usr/bin/google-chrome-stable',
    });

    // ページ開く
    const page = await browser.newPage();
    await page.goto(url);

    // PDFにする
    const fileKey = join(nanoid(), 'result.pdf');
    const localFilePath = join(tmpdir(), fileKey);
    await ensureDir(localFilePath);
    await page.pdf({
      path: localFilePath,
    });

    // S3にアップロード
    const s3 = new S3({ region: S3_REGION! });
    const params: S3.PutObjectRequest = {
      Bucket: S3_BUCKET_NAME!,
      Key: fileKey,
    };
    await s3.putObject(params).promise();

    // 署名付きURL作成
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      ...params,
      // 有効期限(秒)
      Expires: 60,
    });

    return {
      url,
      signedUrl,
    };
  } finally {
    browser?.close();
  }
};

export const handler: Handler<Request, Response> = async (request) => {
  const { url } = request;
  if (!url) throw new Error(`url unfound: ${JSON.stringify(request)}`);

  const response = await printPdf(url);

  return response;
}
