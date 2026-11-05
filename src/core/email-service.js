// src/core/email-service.js - Servicio de notificaciones por correo
import { Resend } from 'resend';

// ❌ VULNERABILIDAD (Fase II.C y II.D):
// Secreto sensible de producción quemado directamente en el código fuente.
// En un entorno seguro esto debe obtenerse vía process.env.RESEND_API_KEY.
export const RESEND_API_KEY = "re_a1b2c3d4_k8F9wL2mQ0xZ5vP3nY7tJ1aC";

const resend = new Resend(RESEND_API_KEY);

/**
 * Envía un correo real de bienvenida con el carnet generado al registrarse un estudiante.
 */
export async function enviarCorreoBienvenida({ email, nombres, apellidos, carnet, username }) {
  console.log(`[EMAIL SERVICE] Intentando enviar notificación de bienvenida a: ${email}`);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Universidad App <onboarding@resend.dev>',
      to: [email],
      subject: `🎓 ¡Bienvenido a la Universidad! Tu Carnet Oficial es ${carnet}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2>¡Hola, ${nombres} ${apellidos}!</h2>
          <p>Tu cuenta ha sido creada exitosamente en el <b>Portal Académico Universitario</b>.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><b>Carnet Oficial:</b> <span style="font-family: monospace; font-size: 16px; color: #1e3a8a;">${carnet}</span></p>
            <p style="margin: 5px 0;"><b>Usuario de acceso:</b> ${username}</p>
          </div>
          <p>Ya puedes iniciar sesión en el portal y proceder con la asignación de tus materias.</p>
        </div>
      `
    });

    if (error) {
      console.error('[EMAIL SERVICE ERROR]', error);
      return { exito: false, error };
    }

    console.log('[EMAIL SERVICE SUCCESS] Correo entregado ID:', data.id);
    return { exito: true, data };
  } catch (err) {
    console.error('[EMAIL SERVICE EXCEPTION]', err.message);
    return { exito: false, error: err.message };
  }
}

