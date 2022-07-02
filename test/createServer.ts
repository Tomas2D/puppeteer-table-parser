import { Server } from 'http';
import * as path from 'path';
import express from 'express';

const port = 7588;

export const getBaseUrl = () => {
  return `http://localhost:${port}`;
};

export const createServer = async (): Promise<Server> => {
  const app = express();

  app.use(express.static(path.join(__dirname, 'assets')));

  return new Promise((resolve) => {
    app.listen(port, function () {
      // @ts-ignore
      resolve(this);
    });
  });
};
