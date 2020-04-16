import HTTP from 'http';
import WebSocket from 'ws';
import { promises as fs } from 'fs';
import { ChildProcess, fork } from 'child_process';
import { resolve } from 'path';

const PORT = 9999;
let childProcessDebugPort = process.debugPort;
const mimeTypes = {
    'html': 'text/html',
    'js': 'text/javascript',
    'css': 'text/css',
    'svg': 'image/svg+xml'
};
const routes = {
    '/tm': {
        pool: 0,
        process: null,
        file: '/tm.html',
        url: 'https://thinkmobiles.com/'
    },
    '/tf': {
        pool: 0,
        process: null,
        file: '/tf.html',
        url: 'https://www.techfeed.net/'
    }
};

const http = HTTP.createServer(async (req, res) => {
    const { url } = req;
    let path = url === '/' ? '/tm' : url;

    const route = routes[path];
    if(route) {
        path = route.file;
    }

    try {
        const pathname = resolve(__dirname, `../static${ path }`);
        const file = await fs.readFile(pathname, 'utf-8');
        const contentType = mimeTypes[path.split('.').pop()];

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(file);
    } catch (error) {
        res.statusCode = 404;
        res.end();
    }
});
http.listen(PORT);

const wss = new WebSocket.Server({ server: http });

wss.on('connection', (socket, req) => {
    const path = req.url === '/' ? '/tm' : req.url;

    const channel = routes[path];
    if(!channel) {
        socket.close();

        return;
    }

    if(++channel.pool === 1) {
        /* Pool isn't empty (starting child) */

        const childPath = resolve(__dirname, './crawler');
        channel.process = fork(childPath, [ channel.url ], { 
            execArgv: [
                `--inspect-brk=${ ++childProcessDebugPort }`
            ]
        });
    }

    channel.process.on('message', message => {
        const data = JSON.stringify(message);
        socket.send(data);
    });

    socket.on('close', _ => {
        if(!--channel.pool) {
            /* Pool is empty (interrupting child) */

            channel.process.kill('SIGKILL');
        }
    });
});