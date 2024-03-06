import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Client } from 'pg';

@Controller()
export class AppController {
  async onApplicationBootstrap() {
    await this.client.connect();

    await this.fetchTitles();
  }

  async onApplicationShutdown() {
    await this.client.end();
  }

  public client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'root',
    password: 'root',
  });

  // @Cron(CronExpression.Every)
  async fetchTitles() {
    console.log('fetching titles');
    const { rows } = await this.client.query('SELECT * FROM urls');
    for (const row of rows) {
      const res = await fetch(row.full_url);
      const text = await res.text();
      const title = text.substring(
        text.indexOf('<title>') + 7,
        text.lastIndexOf('</title>'),
      );
      await this.client.query(
        'UPDATE urls SET title = $1 WHERE short_url = $2',
        [title, row.short_url],
      );
      console.log('fetched title', title, 'for', row.full_url);
    }

    console.log('fetching titles ended');
  }

  @Post()
  async createUrl(@Body() { url }: { url: string }) {
    const {
      rows: [{ short_url, title }],
    } = await this.client.query(
      'INSERT INTO urls (full_url) VALUES ($1) returning short_url, title',
      [url],
    );

    return { short_url, title };
  }

  @Get()
  async getUrls() {
    const { rows } = await this.client.query(
      'SELECT short_url, title FROM urls ORDER BY short_url DESC limit 100',
    );
    return {
      urls: rows,
    };
  }

  @Get(':id')
  async getHello(@Param('id') id: string, @Res() res: Response) {
    const { rows } = await this.client.query(
      'SELECT * FROM urls WHERE short_url = $1',
      [id],
    );

    const row = rows[0];

    if (!row) {
      throw new NotFoundException('not found');
    }
    await this.client.query(
      'UPDATE urls SET hits = hits + 1 WHERE short_url = $1',
      [id],
    );

    (res as any).redirect(row.full_url);
  }
}
