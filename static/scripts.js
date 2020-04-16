document.addEventListener('DOMContentLoaded', () => {
    const url = new URL(window.location.href);
    url.protocol = 'ws';

    const $currentUrl = document.querySelector('#currentUrl');
    const $totalParsed = document.querySelector('#totalParsed');
    
    const $avgLoad = document.querySelector('#avgLoad');
    const $fastestLoad = document.querySelector('#fastestLoad');
    const $slowestLoad = document.querySelector('#slowestLoad');

    const $successStatus = document.querySelector('#successStatus');
    const $redirectStatus = document.querySelector('#redirectStatus');
    const $errorStatus = document.querySelector('#errorStatus');

    const ws = new WebSocket(url.href);
    ws.onmessage = (event) => {
        const { 
            url,
            metrics: {
                total,
                avgLoad,
                fastestLoad,
                slowestLoad,
                successStatus,
                redirectStatus,
                errorStatus
            }
        } = JSON.parse(event.data);

        $currentUrl.textContent = url;
        $totalParsed.textContent = total;
        
        $avgLoad.textContent = `Average: ${ avgLoad }`;
        $fastestLoad.textContent = `Fastest: ${ fastestLoad }`;
        $slowestLoad.textContent = `Slowest: ${ slowestLoad }`;

        $successStatus.textContent = successStatus;
        $redirectStatus.textContent = redirectStatus;
        $errorStatus.textContent = errorStatus;
    }
});