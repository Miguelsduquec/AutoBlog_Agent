import { EventEmitter } from "node:events";
import { Express } from "express";
import { createRequest, createResponse } from "node-mocks-http";

type InvokeOptions = {
  method: string;
  url: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
};

type InvokeResult = {
  status: number;
  body: unknown;
  text: string;
};

export async function invokeApp(app: Express, options: InvokeOptions): Promise<InvokeResult> {
  const request = createRequest({
    method: options.method,
    url: options.url,
    body: options.body,
    query: options.query,
    headers: options.headers
  });

  const response = createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    response.on("end", finish);
    response.on("finish", finish);

    app.handle(request, response, (error: unknown) => {
      if (error) {
        settled = true;
        reject(error);
        return;
      }

      finish();
    });
  });

  const raw = response._getData();
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  let body: unknown = raw;

  if (typeof raw === "string") {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  return {
    status: response.statusCode,
    body,
    text
  };
}
