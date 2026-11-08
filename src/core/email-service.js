// src/core/email-service.js
// Servicio de Notificaciones por Correo Electrónico
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Gestión de Secretos: Cargado dinámicamente de variables de entorno
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

export async function enviarCorreoBienvenida({ email, nombres, carnet, carrera }) {
  try {
    const data = await resend.emails.send({
      from: 'Universidad SA <onboarding@resend.dev>',
      to: [email],
      subject: '¡Bienvenido a Universidad SA! - Tu portal académico',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a8a;">¡Bienvenido, ${nombres}!</h2>
          <p>Tu cuenta estudiantil ha sido creada exitosamente con los siguientes datos:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px;">
            <p><strong>Número de Carnet:</strong> ${carnet}</p>
            <p><strong>Correo Educativo:</strong> ${email}</p>
            <p><strong>Carrera:</strong> ${carrera}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
            Este mensaje es una notificación automática del sistema universitario.
          </p>
        </div>
      `
    });
    return { exito: true, id: data.id };
  } catch (error) {
    return { exito: false, error: error.message };
  }
}
