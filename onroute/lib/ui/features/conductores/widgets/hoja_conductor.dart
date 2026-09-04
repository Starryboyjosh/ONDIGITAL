/// El formulario de un conductor: alta y edición en la misma hoja.
///
/// ## Por qué una hoja y no una pantalla
///
/// Dar de alta a alguien son cuatro campos. Una pantalla completa obligaría a
/// perder de vista la lista, y quien captura conductores lo hace mirando una
/// hoja de papel y la lista a la vez para no repetir a nadie. La hoja sube
/// desde abajo, deja ver el contexto detrás y se cierra con un gesto.
///
/// ## Por qué valida mientras se escribe y no al guardar
///
/// El DNI son trece dígitos. Si el error apareciera al tocar «Guardar», quien
/// escribió doce tendría que releer el número entero para encontrar cuál le
/// faltó. El contador vive debajo del campo desde el primer dígito.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../domain/models/conductor.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Lo que la hoja devuelve cuando se guarda. Datos crudos: quien la abrió
/// decide si son un alta o una edición, porque es quien tiene el repositorio.
@immutable
class DatosConductor {
  const DatosConductor({
    required this.nombre,
    required this.dni,
    required this.telefono,
    required this.licencia,
  });

  final String nombre;
  final String dni;
  final String telefono;
  final TipoLicencia licencia;
}

/// Abre la hoja. `inicial` en `null` es un alta; con valor es una edición.
Future<DatosConductor?> abrirHojaConductor(
  BuildContext context, {
  Conductor? inicial,
}) {
  return showModalBottomSheet<DatosConductor>(
    context: context,
    isScrollControlled: true,
    builder: (BuildContext _) => _HojaConductor(inicial: inicial),
  );
}

class _HojaConductor extends StatefulWidget {
  const _HojaConductor({this.inicial});

  final Conductor? inicial;

  @override
  State<_HojaConductor> createState() => _HojaConductorState();
}

class _HojaConductorState extends State<_HojaConductor> {
  late final TextEditingController _nombre =
      TextEditingController(text: widget.inicial?.nombre ?? '');
  late final TextEditingController _dni =
      TextEditingController(text: widget.inicial?.dni ?? '');
  late final TextEditingController _telefono =
      TextEditingController(text: widget.inicial?.telefono ?? '');
  late TipoLicencia _licencia = widget.inicial?.licencia ?? TipoLicencia.pesada;

  /// Los errores no se pintan hasta que el campo se tocó. Un formulario que
  /// abre en rojo acusa a quien todavía no ha escrito nada.
  final Set<String> _tocados = <String>{};

  @override
  void dispose() {
    _nombre.dispose();
    _dni.dispose();
    _telefono.dispose();
    super.dispose();
  }

  bool get _valido => ValidacionConductor.formularioValido(
        nombre: _nombre.text,
        dni: _dni.text,
        telefono: _telefono.text,
      );

  void _guardar() {
    if (!_valido) {
      setState(() => _tocados.addAll(<String>['nombre', 'dni', 'telefono']));
      return;
    }
    Navigator.of(context).pop(
      DatosConductor(
        nombre: _nombre.text.trim(),
        dni: ValidacionConductor.soloDigitos(_dni.text),
        telefono: ValidacionConductor.soloDigitos(_telefono.text),
        licencia: _licencia,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final bool esAlta = widget.inicial == null;

    return Padding(
      // El teclado tapa el botón de guardar si la hoja no se levanta con él.
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      // Sin decoración propia: la hoja modal la pinta el tema. Ver `hoja_cobro`.
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            Space.xl,
            Space.lg,
            Space.xl,
            Space.xl,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // El asa la dibuja el tema (`bottomSheetTheme.showDragHandle`).
              // Dibujar otra acá dejaba dos, una encima de la otra.
              Text(
                esAlta ? 'Nuevo conductor' : 'Editar conductor',
                style: AppText.titleLg.copyWith(color: c.ink),
              ),
              const SizedBox(height: Space.xs),
              Text(
                esAlta
                    ? 'Queda registrado sin unidad. La asignación es un paso '
                        'aparte.'
                    : 'Cambiar los datos no le mueve el camión.',
                style: AppText.bodySm.copyWith(color: c.ink3),
              ),
              const SizedBox(height: Space.xl),
              _campo(
                clave: 'nombre',
                etiqueta: 'Nombre y apellido',
                ctrl: _nombre,
                capitalizacion: TextCapitalization.words,
                error: ValidacionConductor.nombre(_nombre.text),
              ),
              const SizedBox(height: Space.lg),
              _campo(
                clave: 'dni',
                etiqueta: 'DNI',
                ctrl: _dni,
                teclado: TextInputType.number,
                soloDigitos: true,
                maximo: ValidacionConductor.digitosDni,
                ayuda: '${ValidacionConductor.soloDigitos(_dni.text).length}'
                    ' de ${ValidacionConductor.digitosDni} dígitos',
                error: ValidacionConductor.dni(_dni.text),
              ),
              const SizedBox(height: Space.lg),
              _campo(
                clave: 'telefono',
                etiqueta: 'Teléfono',
                ctrl: _telefono,
                teclado: TextInputType.phone,
                soloDigitos: true,
                maximo: ValidacionConductor.digitosTelefono,
                prefijo: '+504 ',
                ayuda: 'Ocho dígitos, sin el código de país',
                error: ValidacionConductor.telefono(_telefono.text),
              ),
              const SizedBox(height: Space.xl),
              Text(
                'Licencia',
                style: AppText.label.copyWith(color: c.ink2),
              ),
              const SizedBox(height: Space.sm),
              SegmentedButton<TipoLicencia>(
                segments: <ButtonSegment<TipoLicencia>>[
                  for (final TipoLicencia l in TipoLicencia.values)
                    ButtonSegment<TipoLicencia>(
                      value: l,
                      label: Text(l.etiqueta),
                    ),
                ],
                selected: <TipoLicencia>{_licencia},
                onSelectionChanged: (Set<TipoLicencia> s) =>
                    setState(() => _licencia = s.first),
              ),
              const SizedBox(height: Space.sm),
              Text(
                _licencia == TipoLicencia.pesada
                    ? 'Puede llevar un camión de reparto.'
                    : 'Solo moto y vehículo liviano: no se le puede asignar '
                        'un camión.',
                style: AppText.bodySm.copyWith(color: c.ink3),
              ),
              const SizedBox(height: Space.xxl),
              SizedBox(
                width: double.infinity,
                height: Touch.comfortable,
                child: FilledButton(
                  onPressed: _valido ? _guardar : null,
                  child: Text(esAlta ? 'Registrar' : 'Guardar cambios'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _campo({
    required String clave,
    required String etiqueta,
    required TextEditingController ctrl,
    required String? error,
    TextInputType? teclado,
    TextCapitalization capitalizacion = TextCapitalization.none,
    bool soloDigitos = false,
    int? maximo,
    String? prefijo,
    String? ayuda,
  }) {
    final OnRouteColors c = context.colors;
    final bool mostrar = _tocados.contains(clave) && error != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        TextField(
          controller: ctrl,
          keyboardType: teclado,
          textCapitalization: capitalizacion,
          style: soloDigitos ? AppText.data : AppText.body,
          inputFormatters: <TextInputFormatter>[
            if (soloDigitos) FilteringTextInputFormatter.digitsOnly,
            if (maximo != null) LengthLimitingTextInputFormatter(maximo),
          ],
          decoration: InputDecoration(
            labelText: etiqueta,
            prefixText: prefijo,
            errorText: mostrar ? error : null,
          ),
          onChanged: (_) => setState(() => _tocados.add(clave)),
        ),
        if (!mostrar && ayuda != null) ...<Widget>[
          const SizedBox(height: Space.xs),
          Text(ayuda, style: AppText.bodySm.copyWith(color: c.ink3)),
        ],
      ],
    );
  }
}
