import { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const WS_URL = "http://localhost:8080/ws"; // Cambia esto según la configuración del backend

export default function Canvas() {
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const stompClient = useRef(null);

    useEffect(() => {
        const socket = new SockJS(WS_URL);
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                console.log("Connected to WebSocket");
                client.subscribe("/topic/newpoint", (message) => {
                    const point = JSON.parse(message.body);
                    setPoints((prev) => [...prev, point]);
                });
            },
            onStompError: (frame) => {
                console.error("WebSocket error:", frame);
            },
        });

        client.activate();
        stompClient.current = client;

        return () => {
            client.deactivate();
        };
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Limpiar el canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar puntos y líneas
        if (points.length > 0) {
            ctx.beginPath();
            points.forEach(({ x, y }, index) => {
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.moveTo(x, y);
            });
            ctx.stroke();
        }
    }, [points]);

    const handleClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newPoint = { x, y };

        // Enviar al WebSocket
        stompClient.current.send("/topic/newpoint", {}, JSON.stringify(newPoint));

        // También se puede actualizar localmente si se desea
        setPoints((prev) => [...prev, newPoint]);
    };

    return (
        <div>
            <h3>Click to add points</h3>
            <canvas ref={canvasRef} width="600" height="600" onClick={handleClick} style={{ border: "1px solid black" }}></canvas>
        </div>
    );
}
