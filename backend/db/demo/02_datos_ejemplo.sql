BEGIN;

-- ==========================================================
-- 1. SEGURIDAD: ROLES Y USUARIOS
-- ==========================================================
INSERT INTO security_schema.rol (id_rol, nombre_rol) VALUES 
  ('r0000000-0000-0000-0000-000000000001', 'Director'),
  ('r0000000-0000-0000-0000-000000000002', 'Investigador'),
  ('r0000000-0000-0000-0000-000000000003', 'Asistente'),
  ('r0000000-0000-0000-0000-000000000004', 'Estudiante'),
  ('r0000000-0000-0000-0000-000000000005', 'Invitado'),
  ('r0000000-0000-0000-0000-000000000006', 'Soporte');

INSERT INTO security_schema.usuario (id_usuario, nombre, correo, hash_password, debe_cambiar_password, mfa_activo, id_rol, activo, fecha_creacion)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Ana Gomez', 'director@uxlab.utem.cl', 'hash_a1b2', false, true, 'r0000000-0000-0000-0000-000000000001', true, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Felipe Cruz', 'investigador@uxlab.utem.cl', 'hash_c3d4', false, true, 'r0000000-0000-0000-0000-000000000002', true, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Luis Soto', 'asistente@uxlab.utem.cl', 'hash_e5f6', false, false, 'r0000000-0000-0000-0000-000000000003', true, NOW()),
  ('44444444-4444-4444-4444-444444444444', 'Carla Paz', 'estudiante@uxlab.utem.cl', 'hash_g7h8', false, false, 'r0000000-0000-0000-0000-000000000004', true, NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Juan Sol', 'invitado@correo.cl', 'hash_i9j0', false, false, 'r0000000-0000-0000-0000-000000000005', true, NOW()),
  ('66666666-6666-6666-6666-666666666666', 'Admin Soporte', 'soporte@uxlab.utem.cl', 'hash_k1l2', false, true, 'r0000000-0000-0000-0000-000000000006', true, NOW());

-- ==========================================================
-- 2. INVESTIGACIÓN: ESTUDIOS
-- ==========================================================
INSERT INTO research_schema.estudio (id_estudio, codigo_estudio, nombre, descripcion, id_responsable, estado, fecha_inicio)
VALUES 
  ('e5700001-0000-0000-0000-000000000001', 'EST-01', 'Estudio Portal UTEM', 'CEC-2026-001', '22222222-2222-2222-2222-222222222222', 'activo', '2026-10-01'),
  ('e5700002-0000-0000-0000-000000000002', 'EST-02', 'Prueba NeuroUX', 'CEC-2026-005', '22222222-2222-2222-2222-222222222222', 'activo', '2026-10-02');

-- ==========================================================
-- 3. IDENTIDAD: PII AISLADA
-- ==========================================================
INSERT INTO identity_schema.identidad (id_identidad, ux_lab_id, rut_cifrado, nombre_cifrado, correo_cifrado, telefono_cifrado, tipo, fecha_nacimiento, fecha_registro)
VALUES
  ('aaaa1111-0000-0000-0000-000000000001', 'UX-1001', '11.111.111-1', 'Pedro Parra', 'pedro@correo.cl', '56911111111', 'participante', '1990-05-14', NOW()),
  ('aaaa2222-0000-0000-0000-000000000002', 'UX-1002', '22.222.222-2', 'Maria Milla', 'maria@correo.cl', '56922222222', 'participante', '1985-11-20', NOW()),
  ('aaaa3333-0000-0000-0000-000000000003', 'UX-1003', '33.333.333-3', 'Lucas Leon', 'lucas@correo.cl', '56933333333', 'participante', '2010-02-10', NOW()),
  ('aaaa4444-0000-0000-0000-000000000004', 'UX-1004', '44.444.444-4', 'Rosa Leon', 'rosa@correo.cl', '56944444444', 'representante', '1980-08-30', NOW());

INSERT INTO identity_schema.representante_legal (id_identidad_representante, id_identidad_representado, relacion, fecha_inicio)
VALUES
  ('aaaa4444-0000-0000-0000-000000000004', 'aaaa3333-0000-0000-0000-000000000003', 'madre', NOW());

-- ==========================================================
-- 4. PUENTE DE PRIVACIDAD: PARTICIPANTES
-- ==========================================================
INSERT INTO research_schema.participante (id_participante, estado, fecha_registro)
VALUES
  ('bbbb1111-0000-0000-0000-000000000001', 'activo', NOW()),
  ('bbbb2222-0000-0000-0000-000000000002', 'inactivo', NOW()),
  ('bbbb3333-0000-0000-0000-000000000003', 'activo', NOW());

INSERT INTO identity_schema.vinculo_identidad (id_identidad, id_participante)
VALUES
  ('aaaa1111-0000-0000-0000-000000000001', 'bbbb1111-0000-0000-0000-000000000001'),
  ('aaaa2222-0000-0000-0000-000000000002', 'bbbb2222-0000-0000-0000-000000000002'),
  ('aaaa3333-0000-0000-0000-000000000003', 'bbbb3333-0000-0000-0000-000000000003');

-- ==========================================================
-- 5. SEUDONIMIZACIÓN: PARTICIPACIONES (EXP-XXX)
-- ==========================================================
INSERT INTO research_schema.participacion (id_participacion, id_participante, id_estudio, codigo_seudonimo, fecha_inicio, es_menor_al_enrolar, estado)
VALUES
  ('cccc1111-0000-0000-0000-000000000001', 'bbbb1111-0000-0000-0000-000000000001', 'e5700001-0000-0000-0000-000000000001', 'EXP-001', '2026-10-05', false, 'activo'),
  ('cccc2222-0000-0000-0000-000000000002', 'bbbb2222-0000-0000-0000-000000000002', 'e5700001-0000-0000-0000-000000000001', 'EXP-002', '2026-10-05', false, 'retirado'),
  ('cccc3333-0000-0000-0000-000000000003', 'bbbb3333-0000-0000-0000-000000000003', 'e5700002-0000-0000-0000-000000000002', 'EXP-003', '2026-10-06', true, 'activo');

-- ==========================================================
-- 6. ÉTICA: CONSENTIMIENTOS
-- ==========================================================
INSERT INTO ethics_schema.protocolo_version (id_protocolo, id_estudio, version, documento_ruta, documento_hash, estado_cec, id_usuario_registro, fecha_registro)
VALUES 
  ('dddd1111-0000-0000-0000-000000000001', 'e5700001-0000-0000-0000-000000000001', 'v1.0', '/storage/protocolo_est01.pdf', 'hash_prot1', 'aprobado', '22222222-2222-2222-2222-222222222222', NOW()),
  ('dddd2222-0000-0000-0000-000000000002', 'e5700002-0000-0000-0000-000000000002', 'v1.0', '/storage/protocolo_est02.pdf', 'hash_prot2', 'aprobado', '22222222-2222-2222-2222-222222222222', NOW());

INSERT INTO ethics_schema.documento_consentimiento (id_documento, id_estudio, id_protocolo, tipo, version, documento_ruta, documento_hash, vigente, fecha_registro)
VALUES
  ('dddd3333-0000-0000-0000-000000000003', 'e5700001-0000-0000-0000-000000000001', 'dddd1111-0000-0000-0000-000000000001', 'consentimiento', 'v1.0', '/docs/cons_1.pdf', 'hash_doc1', true, NOW()),
  ('dddd4444-0000-0000-0000-000000000004', 'e5700002-0000-0000-0000-000000000002', 'dddd2222-0000-0000-0000-000000000002', 'consentimiento', 'v1.0', '/docs/cons_2.pdf', 'hash_doc2', true, NOW());

INSERT INTO ethics_schema.consentimiento (id_consentimiento, id_participacion, tipo)
VALUES
  ('ffff1111-0000-0000-0000-000000000001', 'cccc1111-0000-0000-0000-000000000001', 'consentimiento'),
  ('ffff2222-0000-0000-0000-000000000002', 'cccc2222-0000-0000-0000-000000000002', 'consentimiento'),
  ('ffff3333-0000-0000-0000-000000000003', 'cccc3333-0000-0000-0000-000000000003', 'consentimiento');

INSERT INTO ethics_schema.evento_consentimiento (id_consentimiento, id_documento, tipo_evento, fecha, evidencia_ruta, id_usuario)
VALUES
  ('ffff1111-0000-0000-0000-000000000001', 'dddd3333-0000-0000-0000-000000000003', 'aceptar', NOW(), '/storage/evidencia_1.pdf', '22222222-2222-2222-2222-222222222222'),
  ('ffff2222-0000-0000-0000-000000000002', 'dddd3333-0000-0000-0000-000000000003', 'retirar', NOW(), '/storage/evidencia_2.pdf', '22222222-2222-2222-2222-222222222222'),
  ('ffff3333-0000-0000-0000-000000000003', 'dddd4444-0000-0000-0000-000000000004', 'aceptar', NOW(), '/storage/evidencia_3.pdf', '22222222-2222-2222-2222-222222222222');

COMMIT;