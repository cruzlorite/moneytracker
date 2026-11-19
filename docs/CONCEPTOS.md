# Conceptos de MoneyTracker

Una palabra para cada cosa y las reglas con las que se calcula. Si algo en la app no encaja con esta hoja, el error está en la app.

## El dinero de un mes

```
Ingresos previstos (2.000 €)
├── Objetivo (300 €)          lo que planeas ahorrar
└── Presupuesto (1.700 €)     lo que planeas gastar
    ├── Gastos previstos (900 €)   alquiler, recibos, seguros…
    ├── Presupuestos (250 €)       tabaco, viajes… (lo que reservas por tipo)
    └── Sin presupuestar (550 €)     comida, salidas, lo demás
```

Lo que no gastes del presupuesto acaba siendo ahorro. Lo que gastes de más sale del ahorro de ese mes.

## Vocabulario

| Palabra | Qué es | Dónde |
|---|---|---|
| **Previsto** | Lo que el plan espera que entre o salga en una fecha: la nómina, el alquiler, el seguro. | Plan («Ingresos previstos», «Gastos previstos») |
| **Objetivo** | Lo que planeas ahorrar. Uno al año y uno por mes; los doce del mes suman el del año. | Plan, Hoy, Año, cierre |
| **Presupuesto** | Lo que planeas gastar en un mes: ingresos previstos − objetivo del mes. Siempre el total, nunca una categoría. | Hoy, cada mes, cierre, Plan |
| **Presupuesto** | Una cantidad que reservas para un tipo de gasto (tabaco, viajes…), al mes o al año. Solo esos gastos se apuntan. | Plan, Hoy («Tus presupuestos») |
| **Sin presupuestar** | La parte del gasto planificado que no es gasto previsto ni presupuesto. Igual todos los meses. | Plan |
| **Ingresado** | Lo que ha entrado en tu cuenta este mes. | Hoy, cada mes, cierre, Análisis |
| **Gastado** | Todo lo que ha salido de tu cuenta menos lo que pasaste al ahorro. Sale del saldo. | Hoy, cada mes, cierre, Análisis |
| **Ahorrado** | Lo que pasaste al ahorro + lo que sobró al cerrar (o − lo que faltó). Nada pasa al mes siguiente. | Hoy, Año, cada mes, cierre |
| **Aportar / consumir** | Un mes en positivo aporta a tu ahorro; uno en negativo lo consume. Lo calcula la app (ingresado − gastado); no hace falta mover nada en el banco. | Cierre, Año |
| **Ahorro e inversión** (tipo) | Dinero que pasas de tu cuenta a ahorro o inversión. Se apunta como un gasto (con el +, o en el Plan si es una transferencia fija), sale de la cuenta, pero **no es gasto**: cuenta como ahorro. | +, Plan |
| **Retirar** | Sacar dinero del ahorro hacia tu cuenta: se apunta con el tipo «Ahorro e inversión» y «Retirar» (importe negativo; solo ahí se admite). Resta de lo ahorrado. | + |
| **Primer día** | La app te pide tu saldo de hoy y ese mes cuenta desde ese día; lo anterior ya está en tu saldo. | Hoy |
| **Por pagar** | Gastos previstos de este mes que aún no han llegado. | Hoy |
| **Sin gastar** | Presupuesto − gastado − por pagar. | Hoy |
| **A este ritmo ≈** | Estimación de cómo acabará, siguiendo lo que llevas. Siempre con ≈. | Hoy, Año, Análisis |
| **Saldo** | Lo que hay en tu cuenta principal (nómina y pagos). Se escribe al cerrar y en «Mirar saldo». | Cierre, Mirar saldo |
| **Mes** | Del día de cobro al día antes del siguiente; se llama por el mes en que termina. | Ajustes («Tu mes empieza el día») |
| **Sin detallar** | Lo que el saldo dice que gastaste y no apuntaste. | Análisis |

## Cómo se calcula

- **Gastado** = saldo al empezar + ingresado − lo movido al ahorro (tipo «Ahorro e inversión») − saldo ahora.
- **Ahorrado** = lo movido al ahorro + (saldo al cerrar − saldo al empezar) = ingresado − gastado. Lo que sobra y se queda en la cuenta ya es ahorro de ese mes; si después lo pasas a otra cuenta, solo cambia de sitio.
- **Objetivo de cada mes** = lo que deja el plan ese mes (ingresos previstos − gastos previstos − presupuestos mensuales − presupuestos anuales / 12) − lo mismo sin presupuestar cada mes, elegido para que los doce sumen el objetivo del año. Un mes con paga extra apunta más alto; uno con el seguro, más bajo, incluso por debajo de cero.
- **Presupuesto del mes** = ingresos previstos − objetivo del mes, con cifras del plan: no se mueve aunque la nómina real varíe.
- **Cada gasto, en su mes.** El mes del seguro es un mes caro. Los presupuestos anuales cuentan en el mes en que gastas.

## Cómo vas

Lo ahorrado (o lo que ahorrarás a este ritmo) frente al objetivo de ese mes. El mismo color en el año, cada mes, Hoy y Análisis.

| Veredicto | Color | Cuándo |
|---|---|---|
| Insuficiente | rojo → naranja | menos del 60 % (rojo hasta el 30 %) |
| Mejorable | amarillo | del 60 % hasta el objetivo |
| Correcto | verde claro | el objetivo |
| Excelente | verde oscuro | 10 % o más por encima |

Si el objetivo del mes es cero o negativo, la distancia se mide con el objetivo medio.

## Gasto frente a lo planificado o a un presupuesto

| Color | Cuándo |
|---|---|
| verde | menos del 85 % |
| amarillo | del 85 % al 100 % (te acercas) |
| naranja | hasta el 115 % (te has pasado un poco) |
| rojo | más del 115 % |

**A este ritmo, a fin de mes** = gastos previstos del mes (como están en el plan) + el resto de lo gastado por regla de tres con los días que llevas. Sale a partir del día 3. Los presupuestos mensuales también la tienen (cuando pasan del 85 %). En Plan y realidad, un presupuesto anual se reparte por igual a lo largo del año: a este ritmo = lo gastado + lo que el presupuesto aún permite gastar de aquí a fin de año. Si hoy vas por delante del reparto, acabarás por encima; si vas por detrás, por debajo.

**El gasto a fin de año** se proyecta mes a mes: lo ya hecho tal como fue; este mes, como arriba; y cada mes por venir, con lo que el plan ya espera en él (el alquiler en todos, el seguro en su mes) más tu ritmo diario en todo lo demás (lo que gastas aparte de lo planificado, por día). Es la línea discontinua del detalle de «Gastado» y la cifra «A fin de año». Con menos de una semana de datos se usa el plan tal cual.

El ahorro a este ritmo sale de la misma cuenta: objetivo del mes + lo que sobraría del presupuesto (o − lo que te pasarías).

## Cómo se muestran las cifras

- Frente al plan, como **«980 / 1.567 €»**: lo real grande, lo planificado al lado en gris, y debajo en pequeño qué es cada uno («gastado / presupuesto», «ahorrado / objetivo», «a este ritmo / objetivo»).
- Las estimaciones llevan **≈** y «a este ritmo».
- **Barras frente al plan**: empiezan en 0 y llegan hasta la mayor de las cifras, así que pasarse se ve como la barra yendo más allá de la marca. Cada marca lleva debajo qué es y cuánto («presupuesto 1.660», «hoy 1.940», «objetivo 4.000»). Lo rayado es la proyección hasta el final; al abrir, la barra crece de izquierda a derecha, lo liso y lo rayado de un solo trazo. En el gasto, lo que queda dentro del plan va en verde y solo el tramo que lo pasa va en naranja o rojo. En «Plan y realidad» cada fila va con su propia escala (25.000 € de ingresos y 600 € de tabaco no caben en la misma): la marca del plan está en el mismo sitio en todas y un triángulo marca «planificado hasta hoy»: lo planificado hasta hoy en esa fila (ingresos y gastos planificados desde su día; ahorro, presupuestos y el resto del gasto, según los días que han pasado; un presupuesto anual, repartido igual por todo el año). En Hoy, el tramo entre donde acabarías el mes y el presupuesto se nombra dentro de la barra («sobrarían 602 €», «te pasarías 34 €»).
- Color con significado: azul ingresos, naranja gastos, violeta ahorro e inversión; de rojo a verde, solo para cómo vas.
- Miles siempre con punto: 1.567 €.

## Lo que hemos decidido no tener

- Huchas o reservas mes a mes: cada gasto cae en su mes.
- Arrastrar lo que sobra al mes siguiente: lo que sobra es ahorro.
- «Día a día» o «resto de vida»: es «sin presupuestar».
- Gastos puntuales en el Plan: se apuntan con el +. (Los ingresos puntuales sí.)
- Logros, retos y rachas.
- Ajustes sobre «cómo ahorras» o preguntas sobre el ahorro al cerrar: el traspaso al ahorro se apunta como un movimiento más.

## El plan tiene historia

- Cambiar algo del plan vale **desde el mes en curso** (o desde / hasta los meses que elijas). Los meses anteriores conservan lo que tenían y todo cambio queda anotado (Ajustes → Cambios del plan).
- Un gasto o ingreso **puntual** solo aparece en el año al que pertenece.
- Los **años** del plan empiezan en el mes que elijas en Ajustes. Se puede mirar hacia delante, nunca hacia atrás; cada pestaña abre en el año en curso.
- Lo que no tiene día cuenta desde el **primer día** del mes.

## Cerrar y actualizar el saldo

- El cierre pide el saldo **del último día del mes**. Si cierras tarde, usa el de ese día, no el de hoy.
- Cada «Actualizar saldo» se guarda y se puede borrar. El saldo de inicio solo se cambia en Ajustes.

## Colores de los importes

Ingreso azul («+»), gasto neutro («−»), ahorro e inversión violeta. Rojo y verde solo para veredictos (pasarse o quedarse corto de un plan). Los tipos propios eligen su color de una paleta fija que cumple contraste.
