### 🚀 ESTADO ACTIVO DEL SISTEMA (v34.19.0 — 2026-11-13)
- **JanIA Server:** `v34.19` (`34.19.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 8 — Observabilidad en Vivo de Consumo API, Telemetría Protegida de Costos/Roles, Alertas Tempranas Anti-Spam y Calibración Post-Campo (`telemetryAndAlertsService.ts` + `sessionManager.ts` + `whatsapp-utils.ts` + `geminiKeyManager.ts` + `janIA.ts` + `index.ts` + `AdminTelemetry.tsx` + `fieldSimulatorService.ts` + `simulate_field_e2e.ts` — Doctrina Eduardo A. Rivera):**
  1. **Telemetría Consolidada Protegida y Alertas Tempranas Anti-Spam:**
     - Nuevo servicio `server/_core/telemetryAndAlertsService.ts` consolidando en tiempo real `getLlmUsageStats()` (Nivel 1 gratuito `$0 COP` vs Nivel 2 `GEMINI_PAID_KEY`), `getTtsUsageStats()` (Laomedeia vs Salomé/texto + `globalAlertThreshold` / `globalBudgetRemaining`) y distribución de roles (`getUserRoleDistributionStats` / `getUserRoleDistributionStatsSync` en `sessionManager.ts`: `agente_inmobiliario`, `propietario_directo`, `comprador_inversionista`, `arrendatario`).
     - Expuesto exclusivamente para administradores en tRPC (`janIA.getOperationalTelemetry` / `janIA.evaluateCostAlerts` vía `adminProcedure`), REST (`GET /api/admin/telemetry` / `POST /api/admin/telemetry/evaluate-alerts` vía `authorizeTelemetryHttpRequest`) y pestaña `AdminTelemetry.tsx` en `Admin.tsx`.
     - Alertas tempranas opcionales a Eduardo (`573166569719`) con deduplicación diaria por `${dateKey}:${channel}:${level}` (sin spam) al superar `GEMINI_PAID_ALERT_THRESHOLD` o el umbral de `TTS_GLOBAL_DAILY_CAP`, manteniendo veto estricto `$0 COP` en `NODE_ENV=test`.
  2. **Simulador E2E en Campo (`$0 COP`) y Calibración Post-Campo (4 Hallazgos Corregidos):**
     - Nuevos módulos `server/_core/jania/fieldSimulatorService.ts` y `server/scripts/simulate_field_e2e.ts` evaluando 4 recorridos multi-turno completos (Agente `40/20/40` + Notarial + Google Reviews, Propietario Directo + Corretaje PDF + Tributario, Comprador/Inversionista + Hipotecario/Cap Rate + Voz, y Consultor Grupal `@JanIA` + Ley 675 PDF), con latencia de interceptores, cero repreguntas de rol y calidad de resúmenes ejecutivos de voz.
     - Calibraciones aplicadas sobre hallazgos reales detectados por el simulador: (a) consistencia anti-repregunta en `agente_inmobiliario` (`dmOnboardingAndDocsHelper.ts`); (b) limpieza de tuberías `|` en `cleanVoiceText` (`whatsapp-utils.ts`) para audio TTS limpio; (c) omisión de `40/20/40` en `contrato_corretaje` cuando el solicitante es `propietario_directo` (`legalContractService.ts` + `legalDocumentPdfService.ts` + `dmHandler.ts`); e (d) interceptor notarial determinístico pre-LLM en `dmHandler.ts` (`executeNotarialAssistanceFromWhatsApp` a `$0 COP`).
  3. **Gobernanza y Suite de Regresión 205:**
     - Semilla `seed-observabilidad-telemetria-simulador-campo-v34-19` en `founderKnowledgeService.ts` y **Suite 205** en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` (**6/6 archivos, 723/723 tests en verde**) | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.18.0 — 2026-11-13)
- **JanIA Server:** `v34.18` (`34.18.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 7 — Consolidación Estructural: Perfilamiento Universal de Roles en Primer Contacto y Gobernanza Mesurada de Gemini Pago + Voz Laomedeia (`sessionManager.ts` + `dmOnboardingAndDocsHelper.ts` + `dmHandler.ts` + `consultingHandler.ts` + `circuloHandler.ts` + `llm.ts` + `geminiKeyManager.ts` + `whatsapp-utils.ts` + `whatsapp-match.ts` — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - En `dmHandler.ts`, el prompt asumía por defecto `>90% de usuarios son COLEGAS INMOBILIARIOS` y `'Colega (nombre aún no identificado)'` cuando no conocía el rol/nombre, sin persistir roles de comprador directo/inversionista/arrendatario ni inyectar `buildSessionOnboardingDirectives` en la conversación. Adicionalmente, `llm.ts` tenía `FALLBACK_MODELS = HIGH_REASONING_MODELS` y `dmHandler.ts` invocaba `highReasoning: true` de manera incondicional en turnos cotidianos; `geminiKeyManager.ts` carecía de telemetría y tope diario para `GEMINI_PAID_KEY`; y `whatsapp-utils.ts` (`textToSpeechMedia`) sintetizaba respuestas largas o con tablas/URLs sin resumen ejecutivo, sin tope diario por usuario y sin bloqueo explícito en `NODE_ENV=test`.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - **Perfilamiento Universal de Roles (`sessionManager.ts`, `dmOnboardingAndDocsHelper.ts`, `dmHandler.ts`, `consultingHandler.ts`):** Nuevos helpers `detectUserBusinessRoleFromText`, `setUserBusinessRole`, `getUserBusinessRole` (`agente_inmobiliario`, `propietario_directo`, `comprador_inversionista`, `arrendatario`) y directiva `contextRoleDirective` para saludar con calidez dejando claro que los servicios gratuitos son para todo público, preguntar brevemente en calidad de qué escribe cuando aún no hay rol confirmado, adaptar las reglas comerciales (`40/20/40` solo agentes; corretaje `$0` publicación / `3%` venta / `1 canon` arriendo propietarios; acompañamiento directo VECY `+57 316 656 9719` sin `40/20/40` compradores/inversionistas/arrendatarios) y prohibir repetir la pregunta una vez persistido el rol.
     - **Gobernanza Mesurada de LLM (`geminiKeyManager.ts` + `llm.ts` + handlers):** Corregido `FALLBACK_MODELS = MECHANICAL_MODELS`, añadido `classifyLlmReasoningComplexity` y `selectGeminiModelsForTask` en `llm.ts` para reservar `HIGH_REASONING_MODELS` y failover pago (`allowPaidFailover`) a consultas jurídicas/financieras/multimodales complejas, más contadores diarios y topes configurables (`GEMINI_PAID_DAILY_CAP`, `GEMINI_PAID_ALERT_THRESHOLD`) en `geminiKeyManager.ts` manteniendo 100% vetada `GEMINI_PAID_KEY` en tests.
     - **Gobernanza Mesurada de Voz Laomedeia (`whatsapp-utils.ts` + `whatsapp-match.ts`):** Agregado `buildConciseVoiceSummaryText` (límite `TTS_PAID_MAX_CHARS`, default `480`, condensando tablas/URLs/textos extensos a resumen ejecutivo mientras entrega texto completo en chat), topes diarios configurables (`TTS_USER_DAILY_CAP` / `TTS_GLOBAL_DAILY_CAP`) con degradación elegante a Salomé gratuita o texto, y bloqueo estricto `$0 COP` en `NODE_ENV=test`.
  3. **Gobernanza y Suite de Regresión 204:**
     - Semilla `seed-consolidacion-roles-gobernanza-gemini-voz-laomedeia-v34-18` en `founderKnowledgeService.ts` y Suite 204 en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.17.0 — 2026-11-13)
- **JanIA Server:** `v34.17` (`34.17.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 6 — Skill 6: Motor Especializado de Propiedad Horizontal (Ley 675 de 2001), Auditoría de Reglamentos PH y Actas, Vivienda Turística (Airbnb / RNT) y Prefactibilidad de Subdivisión/Englobe (`propiedadHorizontalService.ts` + `legalDocumentPdfService.ts` + DM & Grupos — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - JanIA requería un motor determinístico a `$0 COP` de Propiedad Horizontal (Ley 675/2001), Decreto 1074/2015, Ley 2068/2020 (RNT/Airbnb) y normativa registral SNR sin colisionar con `potUrbanNormService.ts`, `financialAndTaxRealEstateService.ts`, `legalContractService.ts`, `notarialExpenseService.ts`, `predialService.ts` ni capturar preguntas teóricas puras ni agradecimientos. Asimismo, se detectó que `sessionManager.ts` leía/escribía `data/jania_persistent_sessions.json` y `pendingSessions` durante `NODE_ENV=test`, filtrando estado (`reviewPromptSent: true`) entre corridas de test.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - Nuevo módulo `server/_core/propiedadHorizontalService.ts`: discriminadores (`hasPhDocumentMarkers`, `isConceptualPhQuestion`, `isPropiedadHorizontalRequest`), calculadoras Ley 675 (`calculatePropiedadHorizontalMetrics`: coeficientes 100%, expensas ordinarias/extraordinarias, mora máx. `1.5x` IBC Art. 30, quórum y mayoría calificada 70% Arts. 45–46 incluyendo >4x presupuesto mensual, caducidad impugnación 2 meses Art. 49 y solidaridad paz y salvo Art. 29), auditoría RPH/Actas (`auditPhRegulationOrMinutes`: Airbnb/RNT prohibición expresa en RPH vs mayoría simple inválida, mascotas, reformas y corte ilegal de servicios/acceso), prefactibilidad desenglobe/subdivisión/englobe (`buildPhPrefeasibilityReport`) y orquestador `analyzePropiedadHorizontalFromWhatsAppInput`.
     - En `server/_core/jania/legalDocumentPdfService.ts`: añadido `"concepto_propiedad_horizontal"` y `generatePropiedadHorizontalPdf` sobre `initVecyPdfScaffold` y `stampVecyPageNumbersAndSave`.
     - Blindaje y canales: exclusiones de precedencia en `potUrbanNormService.ts`, `financialAndTaxRealEstateService.ts`, `legalContractService.ts`, `notarialExpenseService.ts`, `predialService.ts` y `politenessService.ts`; aislamiento `NODE_ENV === "test"` para `userPerpetualSession` en `sessionManager.ts`; integración en `dmHandler.ts` (`consultar_propiedad_horizontal`, guarda en `isCommissionOrCostInquiry`, pre-interceptor), `consultingHandler.ts` (`isOtherToolRequest`, Interceptor 0.9 y fallback `catch`), `circuloHandler.ts` y `whatsapp-match.ts`, junto al Protocolo de Satisfacción + Google Reviews (`v34.11`) y CTA `+57 316 656 9719`.
  3. **Gobernanza y Suite de Regresión 203:**
     - Semilla `seed-propiedad-horizontal-ley675-rph-rnt-desenglobe-v34-17` en `founderKnowledgeService.ts` y Suite 203 (5/5 tests) en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` (**6/6 archivos, 719/719 tests en verde**) | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.16.0 — 2026-11-13)
- **JanIA Server:** `v34.16` (`34.16.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 5 — Skill 5: Motor Especializado de Minutas Jurídicas Personalizadas y Auditoría de Riesgos Contractuales Inmobiliarios en Colombia (`legalContractService.ts` + `legalDocumentPdfService.ts` + DM & Grupos — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - JanIA necesitaba un motor contractual determinístico a `$0 COP` tanto para generar minutas personalizadas en PDF Membretado VECY (Promesa de Compraventa con arras confirmatorias vs retractatorias vs cláusula penal, pago crédito/FNA/leasing y condición suspensiva de estudio de títulos; Arrendamiento de Vivienda Urbana Ley 820 de 2003; Local Comercial Arts. 518–524 C.Co.; Corretaje VECY 3% venta / 1 canon arriendo / $0 cobros por publicación; y Otrosí Modificatorio / Cesión / Acta de Entrega Anticipada) como para auditar borradores o cláusulas enviadas en texto/PDF/imagen, sin colisionar con CTL, POT, FinTax (`leasing habitacional` en una promesa), IDU, Predial o Notarial ni capturar preguntas teóricas o agradecimientos.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - Nuevo módulo `server/_core/legalContractService.ts`: discriminadores (`hasContractDraftMarkers`, `isConceptualContractQuestion`, `isContractMinutaOrAuditRequest`), extractor `parseContractGenerationData`, auditor determinístico `auditContractDraftText` (Semáforo `ROJO`/`AMARILLO`/`VERDE` frente a depósitos Art. 16 e IPC Art. 20 Ley 820, renuncia ilegal Art. 524 / desahucio Art. 520 C.Co., omisión de Notaría/fecha Art. 1611 C.C., arras ambiguas, condición suspensiva de CTL y saneamiento) y orquestador `analyzeContractOrMinutaFromWhatsAppInput` (PDF vía `extractTextSnippetsFromPdfBuffer` a `$0 COP` y Vision fallback fuera de test).
     - En `server/_core/jania/legalDocumentPdfService.ts`: ampliados `LegalDocumentType` (`"otrosi_modificatorio"`, `"acta_entrega_inmueble"`, `"auditoria_riesgos_contractuales"`), `LegalDocumentPdfParams` personalizados, `buildDefaultLegalBody` y nuevo generador `generateContractRiskAuditPdf` sobre `initVecyPdfScaffold` y `stampVecyPageNumbersAndSave`.
     - Precedencia e integración: guardas en `financialAndTaxRealEstateService.ts`, `notarialExpenseService.ts`, `predialService.ts` y `politenessService.ts`; integración en `dmOnboardingAndDocsHelper.ts`, `dmHandler.ts` (herramienta `generar_o_auditar_minuta_contractual`, guarda en `isCommissionOrCostInquiry` y pre-interceptor antes de `analyzeRequirementCompleteness`), `consultingHandler.ts` (`isOtherToolRequest`, Interceptor 0.8 y fallback `catch`), `circuloHandler.ts` y `whatsapp-match.ts`, junto al Protocolo de Satisfacción + Google Reviews (`v34.11`) y CTA `+57 316 656 9719`.
  3. **Gobernanza y Suite de Regresión 202:**
     - Semilla `seed-minutas-juridicas-personalizadas-auditoria-contractual-v34-16` en `founderKnowledgeService.ts` y Suite 202 (5/5 tests) en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.15.0 — 2026-11-13)
- **JanIA Server:** `v34.15` (`34.15.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 4 — Skill 4: Motor Especializado de Simulación Hipotecaria, Leasing Habitacional, Rentabilidad (Cap Rate / Cash-on-Cash / ROI) y Tributación Inmobiliaria Colombia (`financialAndTaxRealEstateService.ts` + PDF Membretado + DM & Grupos — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - JanIA requería un motor financiero y tributario determinístico a `$0 COP` para comparar Crédito Hipotecario vs. Leasing Habitacional (Pesos y UVR, LTV VIS 80% / No-VIS 70% / Leasing 80%–85%, seguros de referencia e ingreso mínimo Ley 546 de 1999 al 30% y rango 40%), evaluar Inversión/Renta (`Cap Rate` bruto/neto, `Cash-on-Cash`, `Yield` mensual, punto de equilibrio y renta tradicional vs corta) y pre-liquidar Tributos de Venta (Retención 1% Art. 398 E.T., Ganancia Ocasional 15% Art. 314 E.T. > 2 años vs Renta Ordinaria < 2 años, exención 5.000 UVT Art. 311-1 E.T. e Impuesto de Timbre > 20.000/50.000 UVT), separado estrictamente de `notarialExpenseService.ts`, con precedencia segura frente a CTL/POT/IDU/Predial/Notarial/ACM y protegido ante preguntas conceptuales pasivas, agradecimientos puros y la intercepción genérica de costos en `dmHandler.ts`.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - Nuevo módulo `server/_core/financialAndTaxRealEstateService.ts`: parser inteligente (`parseFinancialAndTaxQuery`, `isConceptualFinancialOrTaxQuestion`, `isFinancialOrTaxSimulationRequest`) + calculadoras determinísticas (`simulateMortgageVsLeasing`, `evaluateInvestmentAndYield`, `calculateRealEstateTaxPreliquidation`, `buildFinancialAndTaxReport`, `analyzeFinancialAndTaxFromWhatsAppInput`).
     - En `server/_core/jania/legalDocumentPdfService.ts`: añadido `"ficha_financiera_tributaria"` y `generateFinancialAndTaxPdf` con diseño corporativo y QR de trazabilidad VECY.
     - Blindaje de precedencia en `predialService.ts`, `notarialExpenseService.ts` y `politenessService.ts`; integración nativa en `dmHandler.ts` (herramienta `simular_financiero_inversion_y_tributos`, pre-interceptor y guarda en `isCommissionOrCostInquiry`), `consultingHandler.ts` (incluyendo fallback `catch`), `circuloHandler.ts` y `whatsapp-match.ts`, junto al Protocolo de Satisfacción + Google Reviews (`v34.11`) y CTA hacia `+57 316 656 9719`.
  3. **Gobernanza y Suite de Regresión 201:**
     - Semilla `seed-simulador-hipotecario-leasing-caprate-tributario-v34-15` en `founderKnowledgeService.ts` y Suite 201 (5/5 tests) en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.14.0 — 2026-11-13)
- **JanIA Server:** `v34.14` (`34.14.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 3 — Skill 3: Análisis POT / Norma Urbana en Vivo — SINUPOT / Mapas Bogotá IDECA (`potUrbanNormService.ts` + PDF Membretado + DM & Grupos — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - JanIA requería un motor urbanístico determinístico y GIS en vivo para evaluar norma POT de Bogotá (Decreto 555/2021) por `CHIP AAA...`, dirección o sector/UPL/UPZ con cálculo volumétrico para lotes/casas/locales/bodegas, precediendo a IDU/Predial cuando el `CHIP AAA...` viene con intención POT, sin interceptar preguntas puramente conceptuales y sin bloquear agradecimientos sobre análisis POT en `politenessService.ts`.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - Nuevo módulo `server/_core/potUrbanNormService.ts`: consultas GIS en vivo contra IDECA/Catastro Bogotá + SINUPOT best-effort y respaldo determinístico POT Decreto 555/2021 (`$0 COP` en `NODE_ENV=test`), entregando UPL/UPZ, Tratamiento Urbanístico, Área de Actividad, IO, IC base e incentivos, altura máxima, antejardín/aislamientos, usos permitidos/restringidos, alertas (reserva vial, ronda hídrica, remoción en masa, BIC), huella ocupable y área construible en m² y CTA hacia `+57 316 656 9719`.
     - En `server/_core/jania/legalDocumentPdfService.ts`: añadido `"concepto_norma_urbana_pot"` y `generatePotUrbanNormPdf` con QR de trazabilidad VECY.
     - Integración nativa DM & Grupos: herramienta `analizar_norma_urbana_pot` y pre-interceptor en `dmHandler.ts`, interceptores prioritarios en `consultingHandler.ts` (incluyendo fallback `catch`) y `circuloHandler.ts` (después de CTL y antes de IDU/Predial), ampliación de `whatsapp-match.ts`, ajuste en `politenessService.ts` y Protocolo de Satisfacción + Google Reviews (`v34.11`).
  3. **Gobernanza y Suite de Regresión 200:**
     - Semilla `seed-pot-norma-urbana-sinupot-ideca-v34-14` en `founderKnowledgeService.ts` y Suite 200 en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` (**6/6 archivos, 704/704 tests en verde**) | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.13.0 — 2026-11-13)
- **JanIA Server:** `v34.13` (`34.13.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 2 — Skill 2: Motor Especializado de Estudio de Títulos SNR (`ctlTitleStudyService.ts` + PDF Membretado + DM & Grupos — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - JanIA requería un motor especializado para auditar Certificados de Tradición y Libertad (CTL SNR) recibidos en PDF, imagen o texto de anotaciones sin interferir con flyers comerciales ni listados inmobiliarios, y cuidando que los CTLs de Bogotá (con `CHIP AAA...` y número de matrícula) no colisionaran con los interceptores previos de Predial o IDU en grupos.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - Nuevo módulo `server/_core/ctlTitleStudyService.ts`: discriminador multimodal/textual (`hasCtlTextMarkers`, `isExplicitCtlStudyRequest`, `extractTextSnippetsFromPdfBuffer` con `zlib.inflateSync` y hex strings de `pdf-lib`, `extractCtlDocumentWithGemini`), parser `parseCtlFromPlainText` y motor jurídico determinístico (`classifyCtlAnnotation`, `auditCtlParsedDocument`, `analyzeCtlFromWhatsAppInput`).
     - Auditoría anotación por anotación: verificación de tradición ininterrumpida a **10 años** (Ley 791/2002) y **20 años** (Art. 2532 C.C.), alerta roja inmediata ante **Falsa Tradición** (`0600` / derechos y acciones / posesión sin dominio pleno y control de saneamiento posterior `0151`), cruce inteligente de hipotecas, embargos (`0427`), demandas (`0415`), prohibiciones de enajenar, patrimonio de familia (Ley 70/1931), afectación a vivienda familiar (Ley 258/1996), condiciones resolutorias, usufructos, servidumbres, fideicomisos civiles y sucesiones ilíquidas contra cancelaciones (`0841`–`0899`), **Dictamen Jurídico en Semáforo** (`🟢` / `🟡` / `🔴`), desglose de matrícula/ORIP/CHIP/propietarios (`%`), recomendaciones notariales accionables y **Alerta de Riesgo Patrimonial + CTA a `+57 316 656 9719`**.
     - En `server/_core/jania/legalDocumentPdfService.ts`: añadido `"estudio_titulos_snr"`, helpers compartidos `initVecyPdfScaffold` y `stampVecyPageNumbersAndSave`, y generador `generateCtlStudyPdf` con banner de Semáforo, auditoría completa y QR de trazabilidad VECY.
     - Integración nativa DM & Grupos: herramienta `realizar_estudio_titulos_snr` y pre-interceptor en `dmHandler.ts` (adjunto nativo via `setLatestDmPdf` + `awaitingSatisfactionFeedback` + incremento de servicios gratuitos), interceptores prioritarios en `consultingHandler.ts` y `circuloHandler.ts` (precediendo a IDU/Predial para evitar captura errónea por `CHIP`), ampliación de `extractQuotedContextAndMedia`, `isRealEstateConsultationForGroup` y `isServiceDeliveryReply` en `whatsapp-match.ts` y `looksLikeNewToolDataRequest` en `politenessService.ts`.
  3. **Gobernanza y Suite de Regresión 199:**
     - Semilla directiva `seed-estudio-titulos-snr-ctl-v34-13` en `founderKnowledgeService.ts` y Suite 199 (5/5 tests en verde) en `regression.test.ts` (incluyendo actualización de aserciones canónicas de saludo heredadas en líneas 1408 y 11554).
- **Validación Limpia ($0 COP):** Suite completa `NODE_ENV=test npm test` (**6/6 archivos, 702/702 tests en verde**) | `npm run check` (0 errores) | `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.12.0 — 2026-11-13)
- **JanIA Server:** `v34.12` (`34.12.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Punto 1 — Paridad Total de `@JanIA` en Grupos con Motores Determinísticos (`consultingHandler.ts` ↔ `dmHandler.ts` ↔ `whatsapp-match.ts` — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - La promesa de `@JanIA` en grupos (`presentacionGrupoWhatsApp`) ofrecía RUES, Paz y Salvo IDU (PDF), Liquidación Notarial, ACM, Auditoría de Marketing e Imágenes Creativas 1080x1080, pero en `consultingHandler.ts` solo había interceptores directos de Predial y Cédula; además, el IDU no interceptaba antes que Predial (colisión de CHIP `AAA...`), faltaba blindaje anti-LID en `@mentions` (`@573192919978`), y las imágenes creativas no se despachaban nativamente en grupo.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - En `server/_core/jania/types.ts`: Agregados `creativeImageBuffer`, `creativeImageFileName`, `creativeImageCaption` en `JanIAResult`.
     - En `server/_core/identityVerificationService.ts` y `server/_core/ruesService.ts`: Blindaje anti-`@mentions`/LIDs de VECY en `extractAllCedulasForVerification`, exportación de `isExplicitCompanyRuesQuery` e integración con `queryEmpresaOrNit` + limpieza de `@jania` en `extractCleanCorporateQuery`.
     - En `server/_core/notarialExpenseService.ts`: Exportada `isExplicitNotarialLiquidationRequest` sin interceptar disputas generales de arras o contratos.
     - En `server/_core/jania/handlers/consultingHandler.ts`, `circuloHandler.ts` y `dmHandler.ts`: Conectados 7 interceptores determinísticos en orden seguro (`0` Satisfacción/Google Reviews, `1` Paz y Salvo IDU antes de Predial, `2` Predial Bogotá, `3` Cédula/RUES Empresas, `4` Liquidación Notarial exacta, `5` ACM Fitto y Corvini via `isExplicitGroupAcmRequest`, `6` Auditoría Marketing Swap Test + AIDA + ICP via `isExplicitGroupMarketingAuditRequest`), añadido `estrato` y `antiguedadAnos` a `extractAcmAttributesFromText`, `appendGroupSatisfactionClosing` obligatorio, y generación/entrega de `creativeImageBuffer` / `document` PDF incluso en fallback `catch`.
     - En `server/_core/whatsapp-match.ts`: Ampliado `isRealEstateConsultationForGroup` y habilitado el despacho nativo de `creativeImageBuffer` / `popLatestDmCreativeImage` y PDFs en todos los grupos con respuesta de JanIA.
  3. **Gobernanza y Suite de Regresión 198:**
     - Semilla directiva `seed-paridad-total-jania-en-grupos-motores-deterministicos-v34-12` en `founderKnowledgeService.ts` y Suite 198 (6/6 tests en verde) en `regression.test.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Suite 198 `vitest` (6/6 passing) + Suite 197 (4/4) (`NODE_ENV=test`) | Build `npm run build` limpio (`vite build` + `esbuild`).

### 📦 HISTÓRICO RECIENTE (v34.11.0 — 2026-11-12)
- **JanIA Server:** `v34.11` (`34.11.0`) consolidado y validado en local, listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Precisión Quirúrgica en Skill ACM y Protocolo Universal de Satisfacción + Google Reviews por Libre Albedrío (Caso Carolina Z. | eXp Realty — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - En el caso real de Carolina Z. (`eXp Realty`), JanIA respondió un ACM para una casa remodelada de 2008 en Santa Ana Oriental (`242.83 m²`, 4 hab, 4 baños, 3 garajes, cocina con isla, terraza, 2 niveles) con 3 viñetas genéricas más un extenso bloque innecesario de CTL/Escritura/Predial, y no preguntó por la satisfacción ni invitó a calificar en Google, obligando a la usuaria a pedirle el link directamente a Eduardo.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - En `valuation.ts`: Homologación profesional con criterio **Fitto y Corvini** (edad efectiva mitigada para remodelados), sin penalización de piso en casas, bonificación por 3+ parqueaderos, terraza, cocina con isla y relación baños/habitaciones 1:1, microzona `Santa Ana Oriental`, análisis de administración/m², **3 escenarios estratégicos de venta** (Cierre Rápido, Comercial Óptimo, Techo de Negociación), Cap Rate, Perfil de Comprador Ideal (ICP) y `reporteAcmEstructurado`.
     - En `dmHandler.ts`: Exportada `extractAcmAttributesFromText`, actualizada la herramienta `sondeo_mercado_inmobiliario` y eliminado el bloque intrusivo CTL/Escritura/Predial en ACM/sondeos.
     - En `politenessService.ts`, `dmHandler.ts`, `whatsapp-match.ts` y `consultingHandler.ts`: Implementado el **Protocolo Universal de Satisfacción y Google Reviews por Libre Albedrío** (`isExplicitReviewLinkRequest`, `isUserSatisfactionOrFeedbackReply`, `buildAutonomousGoogleReviewInvitation`) tras **cualquier servicio gratuito**, con acuse de feedback constructivo y entrega autónoma de `https://g.page/r/CctNbwU6UpX5EBM/review`.
  3. **Gobernanza y Suite de Regresión 197:**
     - Semilla directiva `seed-precision-acm-profesional-satisfaccion-y-resenas-google-libre-albedrio-v34-11` en `founderKnowledgeService.ts` y 4 pruebas automatizadas en Suite 197 (`regression.test.ts`).
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Suite 197 + regresión completa `vitest` (`NODE_ENV=test`) | Build `npm run build`.


# MODO SÚPER INTELIGENTE, RAZONABLE Y CONCIENCIA PURA (VECY NETWORK PROJECT RULES)

## 1. Conciencia Y Razonamiento Profundo (Deep Reasoning First)
- **Análisis Previo Obligatorio:** Antes de proponer o ejecutar cualquier cambio de código en Vecy Network, lee los archivos involucrados y comprende la arquitectura.
- **Cero Suposiciones:** NUNCA adivines nombres de variables, métodos, rutas de archivos o esquemas de base de datos. Verifica siempre contra el código fuente autoritativo.
- **Rigor Técnico:** Evalúa las consecuencias secundarias de cada modificación en todo el sistema.

## 2. Integridad del Código y "No Hacer Daño" (Code Safety)
- **Prohibida la Destrucción de Código:** NUNCA borres ni rompas funcionalidades existentes que estén funcionando correctamente.
- **Edición Quirúrgica:** Haz únicamente los cambios necesarios y precisos. Preserva los comentarios y estructuras previas no relacionadas con el cambio.
- **Sin Parches Superficiales:** NUNCA soluciones errores silenciando excepciones (`try/except: pass`), borrando tests o retornando valores `null` o ficticios para ocultar fallos. Identifica y corrige la causa raíz.

## 3. Eficiencia Máxima de Tokens y Comunicación Directa
- **Respuestas Concisas y Directas:** Ve directo al grano sin introducciones ni comentarios de relleno.
- **Uso Inteligente de Herramientas de Edición:** Utiliza `replace_file_content` o `multi_replace_file_content` especificando bloques mínimos a cambiar en lugar de reescribir archivos enteros innecesariamente.
- **Cero Desperdicio:** Maximiza el valor de cada token procesado.

## 4. Verificación y Validación Empírica
- **Verificación obligatoria:** NUNCA des por terminada una tarea o solución sin validar que ejecute o compile correctamente mediante comandos de test/build cuando aplique.
- **Inspección de Logs:** Si ocurre un error, la primera acción debe ser leer los logs o tracebacks completos. No diagnostiques a ciegas.

## 5. Atención Estricta a las Órdenes del Usuario
- **Cumplimiento Total:** Prioriza y respeta al 100% las preferencias y límites definidos por el usuario.
- **Claridad ante la duda:** Si una instrucción es ambigua o presenta riesgos de romper el sistema, explica brevemente las opciones y consulta antes de actuar de forma destructiva.

## 6. Registro Obligatorio y Persistente en Documentos Maestros (Triple Bitácora)
- **Actualización Documental Obligatoria:** En CADA conversación o sesión donde se resuelva un requerimiento o se modifique el sistema, es MANDATORIO e INELUDIBLE registrar lo realizado en los tres (3) documentos maestros del proyecto antes de dar la tarea por concluida:
  1. `VECY_CORE_PROYECTO/documentos_maestros/HISTORIAL_CONVERSACIONES_MAESTRO.md`: Registro exhaustivo con solicitud exacta de Eduardo, diagnóstico técnico profundo, causas raíz identificadas y acciones ejecutadas.
  2. `.agents/AGENTS.md`: Registro de memoria persistente con la versión actual y el resumen de cambios.
  3. `VECY_CORE_PROYECTO/documentos_maestros/vecy_network_technical_dossier.md`: Sección 10 (Changelog Técnico y Decisiones de Arquitectura) con problemas identificados y soluciones aplicadas.

## 7. Incremento de Versión, Compilación y Despliegue Obligatorio
- **Incremento de Versión Oficial:** Cada sesión finalizada debe incrementar la versión en `shared/const.ts` y `package.json`.
- **Regla Doctrinal de Versionamiento (.99 -> .00):** Las versiones menores van de `.00` a `.99` (ej. `v32.99`). Al alcanzar `.99`, el siguiente incremento salta OBLIGATORIAMENTE al siguiente número entero mayor con `.00` (ej. `v31.99` + implementación => `v32.00`; `v32.99` + implementación => `v33.00`). JAMÁS usar `.100` ni romper esta regla.
- **Compilación Limpia:** Ejecutar `npm run check` y `npm run build` garantizando cero errores.
- **Commit y Push a Producción:** Confirmar todos los cambios de código y de documentación en git (`git commit`) y enviarlos a GitHub (`git push origin main`), recargando el servicio en el servidor VPS con PM2.

## 8. LAS 5 DIRECTIVAS MANDATORIAS DE GOBERNANZA (VECY DOCTRINE v33.04)
1. **CONSULTA Y ACTUALIZACIÓN DE BITÁCORAS (.md):** Obligatorio registrar cada sesión en `HISTORIAL_CONVERSACIONES_MAESTRO.md`, `AGENTS.md`, `GEMINI.md` y `vecy_network_technical_dossier.md`.
2. **CI/CD Y AUTO-DESPLIEGUE A CONTABO:** Tras verificar `npm test`, `npm run check` y `npm run build`, realizar `git push origin main`. El workflow de GitHub Actions (`.github/workflows/deploy.yml`) se encarga del despliegue en el VPS (`13.140.149.144`).
3. **VIGILANCIA DE COSTOS Y BLINDAJE DE APIS:** Prohibido usar claves de pago en tests (`NODE_ENV=test`). En producción, prioridad absoluta a las 4 claves gratuitas; la de pago solo actúa como failover temporal ante 429 masivo y regresa a costo $0 COP tras el cooldown.
4. **SEGURIDAD Y ANTI-BANEO EN BAILEYS:** Mantener emulación humana de presencia (typing delay entre 1.5s y 3.5s con jitter aleatorio), control de frecuencia y reconexión limpia del socket de WhatsApp.
5. **INTEGRIDAD DE LA MESA DE COINCIDENCIAS:** Proteger las heurísticas de cruce sin alterar las reglas de negocio existentes.


