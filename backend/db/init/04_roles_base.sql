-- Los seis roles base (Actividad 40). Se puede ejecutar más de una vez.
INSERT INTO security_schema.rol (nombre_rol) VALUES
  ('Director'), ('Soporte'), ('Investigador'), ('Asistente'), ('Estudiante'), ('Invitado')
ON CONFLICT (nombre_rol) DO NOTHING;
