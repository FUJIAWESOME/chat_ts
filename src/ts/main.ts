import Cookie from "js-cookie";
import { URL, WS_READY_STATE } from "./constants";
import { addMessageToUI } from "./view";

let socket: WebSocket;

// interface IHttpOptions {
//     method: string
//     headers: string
//     body: {
//         name?: string
//         email?: string
//     }
// }



export async function sendRequest(url: string, method: string, body: string, headers: string) {
    
    // const opt = new Map([
        //     [method: options.method]
        // ])
        
    try {
        const parsedHeaders = JSON.parse(headers);
        const parsedBody = JSON.parse(body);

        const options = {
            method: method,
            headers: parsedHeaders,
            body: body,
        }
    
        const isNotEmptyBody = Object.keys(parsedBody).length;
        if (!isNotEmptyBody) {
            delete options.body;
            // options.body = JSON.stringify(parsedBody);
            // return;
        }

        return await fetch(url, options);
    } catch (error) {
        console.log(error);
    }
}

export function updateName(name: string) {
    const token = Cookie.get('token');

    // const headers = {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    // }
    try {
        const headers = JSON.stringify({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const body = JSON.stringify({
            name: name
        });
        // const options: IHttpOptions = {
        //     method: 'PATCH',
        //     headers: headers,
        //     body: {
        //         name: name,
        //     },
        // }
    
        return sendRequest(URL.API.USER, 'PATCH', body, headers);
        // return sendRequest(URL.API.USER, options);
    } catch (error) {
        console.log(error);
    }

}

export function sendEmail(email: string) {
    try {
        const headers = JSON.stringify({
            'Content-Type': 'application/json'
        });
    
        const body = JSON.stringify({
            email: email
        });
    
        return sendRequest(URL.API.USER, 'POST', body, headers);
    } catch (error) {
        console.log(error);
    }
}

export function getPersonalInfo() {
    const token = Cookie.get('token');

    try {
        const headers = JSON.stringify({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    
        const body = JSON.stringify({});
    
        return sendRequest(URL.API.USER_ME, 'GET', body, headers);
    } catch (error) {
        console.log(error);
    }
}

export function getMessageHistory(token: string) {
    try {
        const headers = JSON.stringify({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    
        const body = JSON.stringify({});
    
        return sendRequest(URL.API.MESSAGES, 'GET', body, headers);
    } catch (error) {
        console.log(error);
    }
}

export function handleRecevingMessages() {
    socket.onmessage = function(event: MessageEvent) {
        try {
            // const eventData: HTMLElement = event.data;
            const data = JSON.parse(event.data);
            const dateNow = new Date(data.createdAt);
        
            const email = localStorage.getItem('email');
            if (data.user.email === email) {
                addMessageToUI(data.user.name, data.text, dateNow, true, true);
            } else {
                addMessageToUI(data.user.name, data.text, dateNow, false, true);
            }
        } catch (error) {
            console.log(error);
        }
    }
}

export function openWebsocket() {
    try {
        const token = Cookie.get('token');
        const isSocketOpen = socket?.readyState === WS_READY_STATE.OPEN;
        const isSocketClose = (socket?.readyState === WS_READY_STATE.CLOSED) || !socket;

        if (isSocketOpen) {
            socket.close();
            socket = new WebSocket(URL.WEB_SOCKET + token);
            handleRecevingMessages();
        } else if (isSocketClose) {
            socket = new WebSocket(URL.WEB_SOCKET + token);
            handleRecevingMessages();
        }
    } catch (error) {
        console.log(error);
    }
}

export function sendMessage(message: string) {
    try {
        if (socket?.readyState === 1) {
            socket.send(JSON.stringify({
                text: `${message}`,
            }));
        }
    } catch (error) {
        console.log(error);
    }
}