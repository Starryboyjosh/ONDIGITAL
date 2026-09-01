/// Dinero en pantalla.
///
/// Convención de nombres del proyecto, por si sirve de referencia: el
/// vocabulario de framework va en inglés (`Panel`, `MoneyText`) y el
/// vocabulario de negocio en español (`Tono`, `Formatos`, y más adelante
/// `Camion`, `Parada`, `Liquidacion`). Traducir "widget" no ayuda a nadie;
/// traducir "liquidación" sí.
///
/// [MoneyOdometer] es la pieza de movimiento firma de OnRoute aplicada al
/// número: cuando entra un cobro, el total no parpadea a su nuevo valor, los
/// dígitos **ruedan**. Es el mismo principio que el progreso que viaja por la
/// ruta — el cambio se ve ocurrir, no aparece ya ocurrido.
library;

import 'package:flutter/material.dart';

import '../format/formatos.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Monto estático. Mono tabular siempre, para que las columnas cuadren.
class MoneyText extends StatelessWidget {
  const MoneyText(
    this.monto, {
    super.key,
    this.style,
    this.color,
    this.conCentavos = true,
  });

  final num monto;
  final TextStyle? style;
  final Color? color;

  /// `false` deja `L 4,320` cuando el monto es exacto. Si tiene centavos se
  /// muestran igual: no se redondea plata a espaldas del usuario.
  final bool conCentavos;

  @override
  Widget build(BuildContext context) {
    final String texto = conCentavos
        ? Formatos.lempiras(monto)
        : Formatos.lempirasCorto(monto);
    return Text(
      texto,
      style: (style ?? AppText.moneyMd)
          .copyWith(color: color ?? context.colors.ink),
    );
  }
}

/// Monto que rueda al cambiar, dígito por dígito.
///
/// Sube cuando el monto sube y baja cuando baja: la dirección del giro es
/// información, no adorno. Con "reducir movimiento" activo se cambia el número
/// de golpe — el estado final nunca se esconde detrás de la animación.
class MoneyOdometer extends StatelessWidget {
  const MoneyOdometer(
    this.monto, {
    super.key,
    this.style,
    this.color,
    this.conCentavos = true,
  });

  final num monto;
  final TextStyle? style;
  final Color? color;
  final bool conCentavos;

  @override
  Widget build(BuildContext context) {
    final TextStyle estilo = (style ?? AppText.moneyLg)
        .copyWith(color: color ?? context.colors.ink);
    final String texto = conCentavos
        ? Formatos.lempiras(monto)
        : Formatos.lempirasCorto(monto);

    if (context.reduceMotion) {
      return Text(texto, style: estilo);
    }

    return _Odometro(
      texto: texto,
      valor: monto.toDouble(),
      style: estilo,
    );
  }
}

class _Odometro extends StatefulWidget {
  const _Odometro({
    required this.texto,
    required this.valor,
    required this.style,
  });

  final String texto;
  final double valor;
  final TextStyle style;

  @override
  State<_Odometro> createState() => _OdometroState();
}

class _OdometroState extends State<_Odometro> {
  late double _anterior = widget.valor;

  @override
  void didUpdateWidget(covariant _Odometro oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.valor != widget.valor) _anterior = oldWidget.valor;
  }

  @override
  Widget build(BuildContext context) {
    final int sentido = widget.valor >= _anterior ? 1 : -1;
    final List<String> glifos = widget.texto.split('');

    return Semantics(
      label: widget.texto,
      child: ExcludeSemantics(
        // Centrado, no por línea base: durante el giro el dígito es un `Stack`
        // sin línea base propia y `CrossAxisAlignment.baseline` lo desalinearía
        // contra los separadores. Todos los glifos comparten estilo y alto, así
        // que centrar da el mismo resultado y es estable.
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            for (int i = 0; i < glifos.length; i++)
              _esDigito(glifos[i])
                  // La llave cuenta desde la derecha: así, cuando el monto pasa
                  // de 999 a 1,000, las unidades siguen siendo las unidades y
                  // solo rueda lo que de verdad cambió.
                  ? _Digito(
                      key: ValueKey<int>(glifos.length - i),
                      digito: glifos[i],
                      sentido: sentido,
                      style: widget.style,
                    )
                  : Text(glifos[i], style: widget.style),
          ],
        ),
      ),
    );
  }

  static bool _esDigito(String s) {
    final int u = s.codeUnitAt(0);
    return u >= 0x30 && u <= 0x39;
  }
}

class _Digito extends StatefulWidget {
  const _Digito({
    super.key,
    required this.digito,
    required this.sentido,
    required this.style,
  });

  final String digito;
  final int sentido;
  final TextStyle style;

  @override
  State<_Digito> createState() => _DigitoState();
}

class _DigitoState extends State<_Digito> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: Motion.normal,
    value: 1,
  );

  // Se crea una vez y se libera: `CurvedAnimation` retiene el listener del
  // controlador, así que instanciarla en `build` filtra en cada frame.
  late final CurvedAnimation _t =
      CurvedAnimation(parent: _ctrl, curve: Motion.out);

  late String _saliente = widget.digito;

  @override
  void didUpdateWidget(covariant _Digito oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.digito != widget.digito) {
      _saliente = oldWidget.digito;
      _ctrl.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _t.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: AnimatedBuilder(
        animation: _t,
        builder: (BuildContext context, _) {
          final double v = _t.value;
          if (v == 1) return Text(widget.digito, style: widget.style);
          return Stack(
            children: <Widget>[
              FractionalTranslation(
                translation: Offset(0, -widget.sentido * v),
                child: Opacity(
                  opacity: 1 - v,
                  child: Text(_saliente, style: widget.style),
                ),
              ),
              FractionalTranslation(
                translation: Offset(0, widget.sentido * (1 - v)),
                child: Opacity(
                  opacity: v,
                  child: Text(widget.digito, style: widget.style),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
