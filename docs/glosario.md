# Glosario — Sistema de Gestión de Pagos y Flujo de Efectivo (Monte Esmeralda)

> Documento vivo. Términos del dominio, en español. Agrega o aclara términos en el mismo PR
> que los introduzca (skill `documentacion-proyecto`).

## Dominio y negocio

- **Monte Esmeralda:** desarrollo inmobiliario (~1,600 viviendas) en Tepeji del Río,
  Hidalgo, de Mi Depto Inmobiliaria S.A. de C.V.
- **Solicitud de Pago:** unidad central del sistema. Registra un pago a proveedor y recorre
  la máquina de estados de aprobación por niveles.
- **Folio:** identificador único y legible de una Solicitud (generado por
  `services/folio.py`).
- **Proveedor (Supplier):** persona/empresa a la que se paga. Existe solo como dato; no
  accede al sistema.
- **Cumplimiento (Clearance):** estado documental/fiscal de un proveedor
  (`cleared` / `pending` / `blocked`), con vigencia. Hoy es informativo; el bloqueo duro en
  la etapa de pago es un pendiente de endurecimiento.
- **Concepto:** categoría del catálogo, organizado como **árbol** (`parent_id`). Solo las
  **hojas** (`is_header = false`) son asignables a una Solicitud.
  - **Concepto propuesto:** el que sugiere quien captura.
  - **Concepto final:** el que confirma el Supervisor (obligatorio para aprobar).
- **Tipo de solicitud (RequestType):** `contractor_estimate`, `supplier_invoice`,
  `reimbursement`, `government_fee`, `utility`, `service`, `tax`, `other`.

## Roles

- **Admin:** acceso total; administra usuarios, catálogos y cumplimientos.
- **Admin de Campo (field_admin):** captura y envía Solicitudes; ve las propias.
- **Supervisor:** revisión operativa; asigna concepto final, aprueba, rechaza o pide
  corrección (etapa `submitted`).
- **CFO:** aprobación financiera; aprueba, difiere, rechaza o pide corrección (etapa
  `supervisor_approved`).
- **Tesorería (treasurer):** consume solicitudes ya aprobadas; solo ve
  `supervisor_approved`, `cfo_approved`, `deferred`.
- **CEO / Contabilidad (accountant) / Ingeniería (engineer):** roles de lectura/consulta.

## Estados de la Solicitud

- **draft (Borrador):** en captura/edición.
- **submitted (Enviada):** en revisión del Supervisor.
- **correction_requested (Corrección solicitada):** devuelta para editar; se reenvía.
- **supervisor_approved (Aprobada por Supervisor):** lista para el CFO.
- **cfo_approved (Aprobada por CFO):** aprobación financiera final (Paquete 1).
- **deferred (Diferida):** pospuesta por el CFO.
- **rejected (Rechazada):** terminal.
- **cancelled (Cancelada):** terminal; desde `draft` o `correction_requested`.

## Técnicos

- **Máquina de estados:** conjunto de transiciones válidas, implementadas como única puerta
  en `services/workflow.py`.
- **Auditoría (`audit_events`):** bitácora append-only con `before_json` / `after_json` de
  cada transición o edición sensible.
- **Capacidad (capability):** permiso atómico (p.ej. `solicitud:submit`) asignado a roles en
  `services/permissions.py`.
- **Paquete 1:** alcance actual (Fundación + Solicitudes de Pago).
- **Paquete 2:** alcance futuro (tesorería, remesas, flujo de efectivo, reportería, fiscal).
- **ADR:** Architecture Decision Record; registro breve de una decisión técnica en
  `docs/arquitectura.md`.
