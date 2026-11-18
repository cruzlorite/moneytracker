# Conceptos de MoneyTracker

Una palabra para cada cosa y las reglas con las que se calcula. Si algo en la app no encaja con esta hoja, el error está en la app.

## El dinero de un mes

```
Ingresos previstos (2.000 €)
├── Objetivo (300 €)          lo que planeas ahorrar
└── Presupuesto (1.700 €)     lo que planeas gastar
    ├── Gastos previstos (900 €)   alquiler, recibos, seguros…
    ├── Límites (250 €)            tabaco, viajes… (lo que vigilas)
    └── Sin planificar (550 €)     comida, salidas, lo demás
```

Lo que no gastes del presupuesto acaba siendo ahorro. Lo que gastes de más sale del ahorro de ese mes.

## Vocabulario

| Palabra | Qué es | Dónde |
|---|---|---|
| **Previsto** | Lo que el plan espera que entre o salga en una fecha: la nómina, el alquiler, el seguro. | Plan («Ingresos previstos», «Gastos previstos») |
| **Objetivo** | Lo que planeas ahorrar. Uno al año y uno por mes; los doce del mes suman el del año. | Plan, Hoy, Año, cierre |
| **Presupuesto** | Lo que planeas gastar en un mes: ingresos previstos − objetivo del mes. Siempre el total, nunca una categoría. | Hoy, cada mes, cierre, Plan |
| **Límite** | Un tope para un tipo de gasto que quieres vigilar, al mes o al año. Solo esos gastos se apuntan. | Plan, Hoy («Tus límites») |
| **Sin planificar** | La parte del presupuesto que no es gasto previsto ni límite. Igual todos los meses. | Plan |
| **Ingresado** | Lo que ha entrado en tu cuenta este mes. | Hoy, cada mes, cierre, Análisis |
| **Gastado** | Todo lo que ha salido de tu cuenta menos lo que pasaste al ahorro. Sale del saldo. | Hoy, cada mes, cierre, Análisis |
| **Ahorrado** | Lo que pasaste al ahorro + lo que sobró al cerrar (o − lo que faltó). Nada pasa al mes siguiente. | Hoy, Año, cada mes, cierre |
| **Aportar / consumir** | Un mes en positivo aporta a tu ahorro; uno en negativo lo consume. Lo calcula la app (ingresado − gastado); no hace falta mover nada en el banco. | Cierre, Año |
| **Ahorro e inversión** (tipo) | Dinero que pasas de tu cuenta a ahorro o inversión. Se apunta como un gasto (con el +, o en el Plan si es una transferencia fija), sale de la cuenta, pero **no es gasto**: cuenta como ahorro. | +, Plan |
| **Primer día** | La app te pide tu saldo de hoy y ese mes cuenta desde ese día; lo anterior ya está en tu saldo. | Hoy |
| **Por pagar** | Gastos previstos de este mes que aún no han llegado. | Hoy |
| **Sin gastar** | Presupuesto − gastado − por pagar. | Hoy |
| **A este ritmo ≈** | Estimación de cómo acabará, siguiendo lo que llevas. Siempre con ≈. | Hoy, Año, Análisis |
| **Saldo** | Lo que hay en tu cuenta principal (nómina y pagos). Se escribe al cerrar y en «Mirar saldo». | Cierre, Mirar saldo |
| **Mes** | Del día de cobro al día antes del siguiente; se llama por el mes en que termina. | Plan («Tu mes empieza el día») |
| **Sin detallar** | Lo que el saldo dice que gastaste y no apuntaste. | Análisis |

## Cómo se calcula

- **Gastado** = saldo al empezar + ingresado − lo movido al ahorro (tipo «Ahorro e inversión») − saldo ahora.
- **Ahorrado** = lo movido al ahorro + (saldo al cerrar − saldo al empezar) = ingresado − gastado. Lo que sobra y se queda en la cuenta ya es ahorro de ese mes; si después lo pasas a otra cuenta, solo cambia de sitio.
- **Objetivo de cada mes** = lo que deja el plan ese mes (ingresos previstos − gastos previstos − límites mensuales − límites anuales / 12) − lo mismo sin planificar cada mes, elegido para que los doce sumen el objetivo del año. Un mes con paga extra apunta más alto; uno con el seguro, más bajo, incluso por debajo de cero.
- **Presupuesto del mes** = ingresos previstos − objetivo del mes, con cifras del plan: no se mueve aunque la nómina real varíe.
- **Cada gasto, en su mes.** El mes del seguro es un mes caro. Los límites anuales cuentan en el mes en que gastas.

## Cómo vas

Lo ahorrado (o lo que ahorrarás a este ritmo) frente al objetivo de ese mes. El mismo color en el año, cada mes, Hoy y Análisis.

| Veredicto | Color | Cuándo |
|---|---|---|
| Insuficiente | rojo → naranja | menos del 60 % (rojo hasta el 30 %) |
| Mejorable | amarillo | del 60 % hasta el objetivo |
| Correcto | verde claro | el objetivo |
| Excelente | verde oscuro | 20 % o más por encima |

Si el objetivo del mes es cero o negativo, la distancia se mide con el objetivo medio.

## Gasto frente al presupuesto o a un límite

| Color | Cuándo |
|---|---|
| verde | menos del 85 % |
| amarillo | del 85 % al 100 % (te acercas) |
| naranja | hasta el 115 % (te has pasado un poco) |
| rojo | más del 115 % |

**A este ritmo, a fin de mes** = gastos previstos del mes (como están en el plan) + el resto de lo gastado por regla de tres con los días que llevas. Sale a partir del día 3. Los límites mensuales también la tienen (cuando pasan del 85 %); los anuales no, porque un viaje se paga de golpe.

El ahorro a este ritmo sale de la misma cuenta: objetivo del mes + lo que sobraría del presupuesto (o − lo que te pasarías).

## Cómo se muestran las cifras

- Frente al plan, como **«980 / 1.567 €»**: lo real grande, lo planificado al lado en gris, y debajo en pequeño qué es cada uno («gastado / presupuesto», «ahorrado / objetivo», «a este ritmo / objetivo»).
- Las estimaciones llevan **≈** y «a este ritmo».
- **Barras frente al plan**: empiezan en 0 y llegan hasta la mayor de las cifras, así que pasarse se ve como la barra yendo más allá de la marca. Cada marca lleva debajo qué es y cuánto («presupuesto 1.660», «hoy 1.940», «objetivo 4.000»). Lo rayado es la proyección hasta el final; al abrir, la barra crece de izquierda a derecha, lo liso y lo rayado de un solo trazo. En el gasto, lo que queda dentro del plan va en verde y solo el tramo que lo pasa va en naranja o rojo. En «Plan y realidad» cada fila va con su propia escala (25.000 € de ingresos y 600 € de tabaco no caben en la misma): la marca del plan está en el mismo sitio en todas y un triángulo marca «planificado hasta hoy»: lo planificado hasta hoy en esa fila (ingresos y gastos planificados desde su día; ahorro, límites y el resto del gasto, según los días que han pasado; un límite anual, repartido igual por todo el año). En Hoy, el tramo entre donde acabarías el mes y el presupuesto se nombra dentro de la barra («sobrarían 602 €», «te pasarías 34 €»).
- Color con significado: azul ingresos, naranja gastos, violeta ahorro e inversión; de rojo a verde, solo para cómo vas.
- Miles siempre con punto: 1.567 €.

## Lo que hemos decidido no tener

- Huchas o reservas mes a mes: cada gasto cae en su mes.
- Arrastrar lo que sobra al mes siguiente: lo que sobra es ahorro.
- «Sacar del ahorro» como movimiento aparte.
- «Día a día» o «resto de vida»: es «sin planificar».
- Gastos puntuales en el Plan: se apuntan con el +. (Los ingresos puntuales sí.)
- Logros, retos y rachas.
- Ajustes sobre «cómo ahorras» o preguntas sobre el ahorro al cerrar: el traspaso al ahorro se apunta como un movimiento más.
