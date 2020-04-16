import axios, { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';

class Crawler extends EventEmitter {
  private readonly LINK_REGEXP = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g;

  private BASE_URL: string;
  private HOSTNAME: string;

  private metrics: Metrics;
  private visited = [];

  constructor(urlAddress: string) {
    super();

    const { hostname } = new URL(urlAddress);

    this.HOSTNAME = hostname;
    this.BASE_URL = urlAddress;

    this.metrics = {
      total: 0,
      avgLoad: 0,
      fastestLoad: 0,
      slowestLoad: 0,
      successStatus: 0,
      redirectStatus: 0,
      errorStatus: 0
    };
  }

  async run() {
    return this.handle(this.BASE_URL);
  }

  private async handle(urlAddress: string) {
    const { hostname } = new URL(urlAddress);
    if (!this.HOSTNAME.includes(hostname)) {
      /* External link */

      return;
    }

    if (this.visited.includes(urlAddress)) {
      return;
    }

    const page = await this.fetchPage(urlAddress);

    this.visited.push(urlAddress);
    this.calculateMetrics(page);
    this.callIpc(page);

    const {
      error,
      response: {
        data
      }
    } = page;

    if(error) {
      return;
    }

    const matcher = data.matchAll(this.LINK_REGEXP);
    for (let link of matcher) {
      let href: string = link[2];

      /* Relative address */
      if (href.startsWith('/')) {
        href = this.BASE_URL.endsWith('/') 
          ? `${ this.BASE_URL.slice(0, -1) }${ href }`
          : `${ this.BASE_URL }${ href }`;
      }

      try {
        await this.handle(href);
      } catch (err) {
        /* Skip malformed url's */

        console.error(err.message);
      }
    }
  }

  async fetchPage(url: string): Promise<Page> {
    let result: Page

    try {
      const start = Date.now();
      const response = await axios.get(url);
      const duration = Date.now() - start;

      result = {
        url,
        response,
        duration
      };
    } catch (error) {
      const { response = {} } = error;

      result = {
        url,
        error,
        response
      };
    }

    return result;
  }

  callIpc(page: Page) {
    const {
      url,
      error
    } = page;

    const message = {
      url,
      metrics: this.metrics
    };

    if (error) {
      this.emit(EventTypes.ERROR, message);

      return;
    }

    this.emit(EventTypes.LOAD, message);
  }

  calculateMetrics(page: Page) {
    const {
      duration, 
      response: {
        status
      }
    } = page;

    const {
      total,
      avgLoad,
      fastestLoad,
      slowestLoad
    } = this.metrics;

    if(duration) {
      if (!total) {
        this.metrics.avgLoad = duration;
        this.metrics.fastestLoad = duration;
        this.metrics.slowestLoad = duration;
  
        ++this.metrics.total;
      } else {
        this.metrics.avgLoad = (avgLoad * total + duration) / ++this.metrics.total;
        duration < fastestLoad && (this.metrics.fastestLoad = duration);
        duration > slowestLoad && (this.metrics.slowestLoad = duration);
      }
    }

    switch (~~(status / 100)) {
      case 5: {
        /* 500-like */
        this.metrics.errorStatus++;

        break;
      }
      case 3: {
        /* 300-like */
        this.metrics.redirectStatus++;

        break;
      }
      case 2: {
        /* 200-like */
        this.metrics.successStatus++;

        break;
      }
    }
  }
}

enum EventTypes {
  ERROR = 'error',
  LOAD = 'load'
};

type Metrics = {
  total: number;
  avgLoad: number;
  fastestLoad: number;
  slowestLoad: number;
  successStatus: number;
  redirectStatus: number;
  errorStatus: number;
};

type Page = {
  url: string,
  duration?: number;
  response: AxiosResponse<any>;
  error?: any;
};

export {
  Crawler,
  EventTypes
};