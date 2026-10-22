-- =====================================================================
-- plaGesEtic · datos_prueba.sql  (SOLO DESARROLLO — nunca en producción)
-- Carga usuarios, estudios, protocolos, documentos de consentimiento, membresías y una autorización
-- especial de los datos sintéticos
-- (Datos_Sinteticos_plaGesEtic_vFinal.xlsx) para probar las rutas a mano.
-- Requiere los scripts 01 a 05 de db/init. Se puede ejecutar de nuevo: borra y recarga.
-- Las contraseñas son hashes de relleno: el login real llega con la Actividad 40.
-- =====================================================================
BEGIN;
-- Consentimientos y eventos registrados al probar (Actividad 55). Van primero porque apuntan a la
-- participación y al documento. evento_consentimiento es de solo inserción para la API (usuario de la
-- aplicación); este script corre como plagesetic_owner, por eso sí puede vaciarla al recargar.
DELETE FROM ethics_schema.evento_consentimiento;
DELETE FROM ethics_schema.consentimiento;
-- Participaciones e identidades creadas al probar (se borran primero por sus claves foráneas)
DELETE FROM research_schema.participacion;
DELETE FROM identity_schema.vinculo_identidad;
DELETE FROM research_schema.participante;
DELETE FROM identity_schema.representante_legal;
DELETE FROM identity_schema.identidad;
DELETE FROM security_schema.sesion_usuario;
DELETE FROM security_schema.mfa_codigo_recuperacion;
-- Autorizaciones especiales (Actividad 56): apuntan al usuario y al estudio, por eso van antes
DELETE FROM security_schema.autorizacion;
DELETE FROM security_schema.membresia_estudio;
DELETE FROM ethics_schema.documento_consentimiento;
DELETE FROM ethics_schema.protocolo_version;
DELETE FROM research_schema.estudio;
DELETE FROM security_schema.usuario;
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('f4c13880-ed8a-5b4c-8ce7-f6ddfd84d063','Marcela Fuentes','test_director@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Director'),true,NULL,'2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('7cc7cad1-b65d-5c2b-8fca-b1ebb49c71ab','Rodrigo Tapia','test_soporte@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Soporte'),true,NULL,'2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('50f57b1d-649f-5711-9f26-323acc8dcd4c','Paula Riquelme','test_soporte_aut@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Soporte'),true,NULL,'2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('f709e3ea-c031-5ded-9a0e-9b6188d3eb90','Gonzalo Vidal','test_investigador@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Investigador'),true,NULL,'2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('80887807-24c8-5d42-ae7e-7cc9d7335a55','Camila Navarro','test_asistente@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Asistente'),true,NULL,'2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('90a3e391-7aea-5fc7-a26f-308bc624cb1d','Ignacio Herrera','test_estudiante@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Estudiante'),true,'2026-12-15','2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('98fa5198-139c-5cc7-a9b4-b38d38826575','Antonia Carrasco','test_estudiante_aut@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Estudiante'),true,'2026-12-15','2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('ef298acc-ded2-5f5f-95d7-55b43e6915cc','Tomás Bravo','test_invitado@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Invitado'),true,'2026-11-30','2026-09-01 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('955846fa-5235-5428-aa14-d898079a1b86','Valeria Ortiz','test_nuevo@uxlab.test','solo-desarrollo',true,false,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Asistente'),true,NULL,'2026-10-02 09:00');
INSERT INTO security_schema.usuario (id_usuario,nombre,correo,hash_password,debe_cambiar_password,mfa_activo,id_rol,activo,fecha_expiracion,fecha_creacion) VALUES ('ba20a30c-0487-59eb-b15f-fe0db7c99a86','Martín Salinas','test_invitado_vencido@uxlab.test','solo-desarrollo',false,true,(SELECT id_rol FROM security_schema.rol WHERE nombre_rol='Invitado'),true,'2026-09-30','2026-09-01 09:00');
INSERT INTO research_schema.estudio (id_estudio,codigo_estudio,nombre,descripcion,id_responsable,estado,fecha_inicio,fecha_fin,retencion_hasta) VALUES ('82bbf931-bc9f-594d-8203-77dc4608f2cc','EST-01','Estudio Portal UTEM','Usabilidad del portal estudiantil (ficticio).','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','activo','2026-09-15','2027-06-30','2031-12-31');
INSERT INTO research_schema.estudio (id_estudio,codigo_estudio,nombre,descripcion,id_responsable,estado,fecha_inicio,fecha_fin,retencion_hasta) VALUES ('5f74778f-0d12-5b6f-9adf-e18fabee11ee','EST-02','Prueba NeuroUX','Eye tracking y EEG en lectura digital (ficticio).','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','activo','2026-09-20','2027-03-31','2031-12-31');
INSERT INTO research_schema.estudio (id_estudio,codigo_estudio,nombre,descripcion,id_responsable,estado,fecha_inicio,fecha_fin,retencion_hasta) VALUES ('fa8cc559-9084-5018-b3fb-e080ba492f7e','EST-03','Estrés y respuesta GSR','Estudio en preparación (ficticio).','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','borrador','2026-11-01',NULL,NULL);
INSERT INTO ethics_schema.protocolo_version (id_protocolo,id_estudio,version,documento_ruta,documento_hash,estado_cec,codigo_aprobacion_cec,fecha_aprobacion_cec,fecha_vencimiento_cec,id_usuario_registro,fecha_registro) VALUES ('a6c09a77-28c9-5cbb-a127-5f4bcf061bb8','82bbf931-bc9f-594d-8203-77dc4608f2cc','1.0','/etica/protocolos/EST-01_v1.0.pdf','2fe1fd371c4d8de7f14ac3dc814b6343bbabc2a223431451328f16d666acbf2a','aprobado','CEC-2026-001','2026-09-10','2027-06-30','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-09-10 12:00');
INSERT INTO ethics_schema.protocolo_version (id_protocolo,id_estudio,version,documento_ruta,documento_hash,estado_cec,codigo_aprobacion_cec,fecha_aprobacion_cec,fecha_vencimiento_cec,id_usuario_registro,fecha_registro) VALUES ('6f9f0f7d-9fb2-5226-980d-00e782db1cf8','82bbf931-bc9f-594d-8203-77dc4608f2cc','1.1','/etica/protocolos/EST-01_v1.1.pdf','d0a127db0269b394fe392bf7ac106fc71618611c07877deb153447db5be07f94','aprobado','CEC-2026-001-M1','2026-09-28','2027-06-30','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-09-28 16:00');
INSERT INTO ethics_schema.protocolo_version (id_protocolo,id_estudio,version,documento_ruta,documento_hash,estado_cec,codigo_aprobacion_cec,fecha_aprobacion_cec,fecha_vencimiento_cec,id_usuario_registro,fecha_registro) VALUES ('f76a34b8-94cd-51f3-a0e1-565bf2469b7b','5f74778f-0d12-5b6f-9adf-e18fabee11ee','1.0','/etica/protocolos/EST-02_v1.0.pdf','d06dcb9743d6511b30802e04f46506629c9f4bd88b4138bd61d10ef44a7f9d59','aprobado','CEC-2026-005','2026-09-18','2027-03-31','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-09-18 11:00');
INSERT INTO ethics_schema.protocolo_version (id_protocolo,id_estudio,version,documento_ruta,documento_hash,estado_cec,codigo_aprobacion_cec,fecha_aprobacion_cec,fecha_vencimiento_cec,id_usuario_registro,fecha_registro) VALUES ('475f09f4-d69d-5de4-8dd4-edf8c3360117','fa8cc559-9084-5018-b3fb-e080ba492f7e','1.0','/etica/protocolos/EST-03_v1.0.pdf','3c4f010ea3cce8f0bc0a020d34cb87c9ec4c4b57237fb059927f51f8b669b2b4','pendiente',NULL,NULL,NULL,'f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-10-01 10:00');
-- Documentos de consentimiento (Actividad 55): v1.0 vigente de consentimiento y de asentimiento para EST-01,
-- y un consentimiento v1.0 de EST-02 (sirve para probar «documento de otro estudio», CP-18).
-- El hash es el SHA-256 real de los PDF ficticios de backend/pruebas/archivos/. La ruta es relativa al
-- volumen «almacenamiento», como las que guarda la API; esos PDF no se copian al volumen (la descarga es de la Act. 57).
INSERT INTO ethics_schema.documento_consentimiento (id_documento,id_estudio,id_protocolo,tipo,version,documento_ruta,documento_hash,vigente,fecha_registro) VALUES ('a7d33f8a-00de-5eab-9c77-e43433f95084','82bbf931-bc9f-594d-8203-77dc4608f2cc','6f9f0f7d-9fb2-5226-980d-00e782db1cf8','consentimiento','1.0','consentimientos/datos-prueba/consentimiento_EST-01_v1.0.pdf','70f037074668949d0f470cd74d77fb07bab1c87a7a6e4add053ea69a72c57d14',true,'2026-09-28 16:30');
INSERT INTO ethics_schema.documento_consentimiento (id_documento,id_estudio,id_protocolo,tipo,version,documento_ruta,documento_hash,vigente,fecha_registro) VALUES ('7094fc30-60c6-57da-bbce-8f760d77e8e0','82bbf931-bc9f-594d-8203-77dc4608f2cc','6f9f0f7d-9fb2-5226-980d-00e782db1cf8','asentimiento','1.0','consentimientos/datos-prueba/asentimiento_EST-01_v1.0.pdf','6d372cba298e980e4caefdeacd9fe1ef4b1c5b5a2733dc76e64f3de89c715d73',true,'2026-09-28 16:30');
INSERT INTO ethics_schema.documento_consentimiento (id_documento,id_estudio,id_protocolo,tipo,version,documento_ruta,documento_hash,vigente,fecha_registro) VALUES ('d6a3faed-4e8e-5b85-becb-b11c9772006a','5f74778f-0d12-5b6f-9adf-e18fabee11ee','f76a34b8-94cd-51f3-a0e1-565bf2469b7b','consentimiento','1.0','consentimientos/datos-prueba/consentimiento_EST-02_v1.0.pdf','5cf9935c11a8fdb7ba9bb69086d38e1503552b4c28f9958d65e616c8a35e016a',true,'2026-09-18 11:30');
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('71f086a1-98a4-58d7-b4db-a1e2be78dce2','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','82bbf931-bc9f-594d-8203-77dc4608f2cc',true,true,true,true,true,'f4c13880-ed8a-5b4c-8ce7-f6ddfd84d063','2026-09-15',NULL);
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('4f609082-a4bb-51bd-8f3c-08976e3d4a6e','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','5f74778f-0d12-5b6f-9adf-e18fabee11ee',true,true,true,true,true,'f4c13880-ed8a-5b4c-8ce7-f6ddfd84d063','2026-09-20',NULL);
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('29b93f3d-b4be-5fae-9884-ebad1d1a533f','80887807-24c8-5d42-ae7e-7cc9d7335a55','82bbf931-bc9f-594d-8203-77dc4608f2cc',true,true,true,false,false,'f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-09-15',NULL);
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('a2279d80-b578-58d4-91c2-cf7bed7dab60','90a3e391-7aea-5fc7-a26f-308bc624cb1d','82bbf931-bc9f-594d-8203-77dc4608f2cc',true,false,false,false,false,'f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-10-01','2026-12-15');
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('a777542d-87cb-5f85-8903-bb0fd6c753c9','98fa5198-139c-5cc7-a9b4-b38d38826575','82bbf931-bc9f-594d-8203-77dc4608f2cc',true,false,false,false,false,'f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-10-01','2026-12-15');
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('a22c5446-f769-59e3-99ff-211706ada49d','ef298acc-ded2-5f5f-95d7-55b43e6915cc','82bbf931-bc9f-594d-8203-77dc4608f2cc',true,false,false,false,false,'f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-10-01','2026-11-30');
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('d1dc66c3-6af8-5d42-8711-97f02fed4f26','955846fa-5235-5428-aa14-d898079a1b86','82bbf931-bc9f-594d-8203-77dc4608f2cc',true,false,false,false,false,'f709e3ea-c031-5ded-9a0e-9b6188d3eb90','2026-10-02',NULL);
INSERT INTO security_schema.membresia_estudio (id_membresia,id_usuario,id_estudio,puede_consultar,puede_cargar,puede_modificar,puede_descargar,puede_exportar,id_otorgante,fecha_inicio,fecha_fin) VALUES ('984d8f9e-a480-549c-8755-d7cacb29b6d8','f709e3ea-c031-5ded-9a0e-9b6188d3eb90','fa8cc559-9084-5018-b3fb-e080ba492f7e',true,true,true,true,true,'f4c13880-ed8a-5b4c-8ce7-f6ddfd84d063','2026-10-01',NULL);
-- Autorización especial ver_identidad (Actividad 56, ADR-002 D13): la Asistente puede desenmascarar
-- en EST-01 (y solo ahí) hasta fin de año. La aprobó el Director. Sirve para los casos CP-34 y CP-35.
INSERT INTO security_schema.autorizacion (id_autorizacion,id_usuario,id_estudio,tipo,recurso,id_registro_objetivo,motivo,estado,id_autorizador,fecha_solicitud,fecha_resolucion,fecha_vencimiento) VALUES ('7ad0e9a5-3af5-58d6-a046-7f4b491e7c0d','80887807-24c8-5d42-ae7e-7cc9d7335a55','82bbf931-bc9f-594d-8203-77dc4608f2cc','ver_identidad','identidad',NULL,'Verificar la identidad de participantes de EST-01 a pedido del Comité de Ética (ficticio, solo pruebas).','aprobada','f4c13880-ed8a-5b4c-8ce7-f6ddfd84d063','2026-10-19 10:00','2026-10-19 12:00','2026-12-31 23:59');
COMMIT;

-- IDs fijos de los estudios (para usarlos en pruebas/estudios.http):
--   EST-01: 82bbf931-bc9f-594d-8203-77dc4608f2cc
--   EST-02: 5f74778f-0d12-5b6f-9adf-e18fabee11ee
--   EST-03: fa8cc559-9084-5018-b3fb-e080ba492f7e

-- IDs fijos de los documentos de consentimiento (para usarlos en pruebas/consentimientos.http):
--   EST-01 consentimiento v1.0: a7d33f8a-00de-5eab-9c77-e43433f95084
--   EST-01 asentimiento   v1.0: 7094fc30-60c6-57da-bbce-8f760d77e8e0
--   EST-02 consentimiento v1.0: d6a3faed-4e8e-5b85-becb-b11c9772006a

-- ID fijo de la autorización especial (para pruebas/seudonimizacion.http):
--   ver_identidad de test_asistente en EST-01: 7ad0e9a5-3af5-58d6-a046-7f4b491e7c0d
