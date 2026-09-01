/// La voz de Vito.
///
/// ## Por qué esto es presentación y no dominio
///
/// [Hallazgo] llega desde `domain/logic/vito_analista.dart` sin texto, a
/// propósito: encontrar es cálculo reproducible, redactar es un problema de
/// idioma. Esta capa es la única parte de Vito que un día podría cambiar de
/// proveedor de lenguaje sin que nada del cuadre se mueva un centavo — y por
/// eso vive aislada aquí, como una función pura que solo lee `Hallazgo` y
/// devuelve texto.
///
/// ## La regla que no se negocia
///
/// Vito describe la brecha, nunca a la persona. "Faltan L 430 del sobre" es
/// un hecho verificable; "el vendedor se quedó con L 430" es una acusación
/// que la app no tiene forma de probar. Quien lea el cuadre decide qué
/// significa el número — Vito solo se lo entrega completo y sin adjetivos.
library;

import 'package:meta/meta.dart';

import '../../../domain/logic/vito_analista.dart';
import '../../core/format/formatos.dart';

/// Una frase de Vito, lista para mostrarse. Tres piezas porque una fila del
/// panel casi siempre necesita las tres por separado: el titular en el
/// vistazo, el detalle al leer, la acción al decidir.
@immutable
final class FraseVito {
  const FraseVito({
    required this.titular,
    required this.detalle,
    this.accion,
  });

  /// Una línea, lo que se lee de un vistazo.
  final String titular;

  /// Una o dos frases con los números que sostienen el titular.
  final String detalle;

  /// Qué hacer, si hay algo que hacer. `null` cuando el hallazgo es solo
  /// informativo (por ejemplo, `diaLimpio` no pide ninguna acción).
  final String? accion;
}

/// Redacta un [Hallazgo] en español hondureño operativo.
///
/// El `switch` es exhaustivo sin `default` a propósito: si mañana se agrega
/// un [TipoHallazgo], el compilador tiene que avisar aquí antes de que Vito
/// se quede mudo frente a un hallazgo real.
///
/// [etiqueta] es el nombre comercial del producto cuando el hallazgo señala
/// uno. Se pasa desde afuera porque el catálogo vive en la bodega y el
/// [Hallazgo] solo carga el SKU: Vito no debe decirle "HAR-50" a nadie, pero
/// tampoco puede cargar con el catálogo entero para averiguarlo.
FraseVito redactar(Hallazgo h, {String? etiqueta}) {
  switch (h.tipo) {
    case TipoHallazgo.cajaCorta:
      return _cajaCorta(h);
    case TipoHallazgo.cajaSobrada:
      return _cajaSobrada(h);
    case TipoHallazgo.entregaSinRegistro:
      return _entregaSinRegistro(h);
    case TipoHallazgo.cargaFaltante:
      return _cargaFaltante(h);
    case TipoHallazgo.cargaSobrante:
      return _cargaSobrante(h);
    case TipoHallazgo.conteoPendiente:
      return _conteoPendiente(h);
    case TipoHallazgo.productoNoAlcanza:
      return _productoNoAlcanza(h, etiqueta);
    case TipoHallazgo.creditoAlto:
      return _creditoAlto(h);
    case TipoHallazgo.clienteCerradoRepetido:
      return _clienteCerradoRepetido(h);
    case TipoHallazgo.rutaAtrasada:
      return _rutaAtrasada(h);
    case TipoHallazgo.diaLimpio:
      return _diaLimpio(h);
  }
}

FraseVito _cajaCorta(Hallazgo h) {
  final String dif = Formatos.lempiras(h.diferencia!.enLempiras);
  final String esp = Formatos.lempiras(h.esperado!.enLempiras);
  final String real = Formatos.lempiras(h.real!.enLempiras);
  return FraseVito(
    titular: 'Faltan $dif del sobre',
    detalle: 'El sobre debía traer $esp y trajo $real.',
    accion: 'Revisa el conteo de caja con quien cerró la ruta.',
  );
}

FraseVito _cajaSobrada(Hallazgo h) {
  final String dif = Formatos.lempiras(h.diferencia!.enLempiras);
  final String esp = Formatos.lempiras(h.esperado!.enLempiras);
  final String real = Formatos.lempiras(h.real!.enLempiras);
  return FraseVito(
    titular: 'El sobre trae $dif de más',
    detalle: 'Se esperaban $esp y llegaron $real.',
    accion: 'Busca si hay un cobro que no quedó anotado en una parada.',
  );
}

FraseVito _entregaSinRegistro(Hallazgo h) {
  final String dif = Formatos.lempiras(h.diferencia!.enLempiras);
  final String esp = Formatos.lempiras(h.esperado!.enLempiras);
  final String real = Formatos.lempiras(h.real!.enLempiras);
  return FraseVito(
    titular: 'Hay $dif en producto sin explicación',
    detalle: 'Salió mercadería por $esp y solo se justifican $real entre '
        'cobrado y fiado.',
    accion: 'Revisa parada por parada si falta anotar una entrega.',
  );
}

FraseVito _cargaFaltante(Hallazgo h) {
  final String bultos = Formatos.cantidad(h.unidades!);
  final String valor = Formatos.lempiras(h.diferencia!.enLempiras);
  return FraseVito(
    titular: 'Faltan $bultos bultos en la parrilla',
    detalle: 'Ese producto vale $valor.',
    accion: 'Recuenta la parrilla antes de cerrar el cuadre.',
  );
}

FraseVito _cargaSobrante(Hallazgo h) {
  final String bultos = Formatos.cantidad(h.unidades!);
  final String valor = Formatos.lempiras(h.diferencia!.enLempiras);
  return FraseVito(
    titular: 'Sobran $bultos bultos en la parrilla',
    detalle: 'Ese producto vale $valor.',
    accion: 'Confirma que no quedó carga de otra ruta mezclada.',
  );
}

FraseVito _conteoPendiente(Hallazgo h) {
  return const FraseVito(
    titular: 'Falta contar la parrilla',
    detalle: 'Sin ese conteo, la brecha de carga es desconocida, no cero.',
    accion: 'Cuenta lo que volvió en el camión antes de cerrar.',
  );
}

FraseVito _productoNoAlcanza(Hallazgo h, String? etiqueta) {
  final String bultos = Formatos.cantidad(h.unidades!);
  final String sku = etiqueta ?? h.sku ?? 'el producto';
  final String? valor = h.diferencia == null
      ? null
      : Formatos.lempiras(h.diferencia!.enLempiras);
  return FraseVito(
    titular: 'No va a alcanzar $sku para las paradas que faltan',
    detalle: valor == null
        ? 'Faltan $bultos bultos para completar los pedidos pendientes.'
        : 'Faltan $bultos bultos ($valor) para completar los pedidos '
            'pendientes.',
    accion: 'Manda a resurtir o reordena las paradas antes de que se note.',
  );
}

FraseVito _creditoAlto(Hallazgo h) {
  final String credito = Formatos.lempiras(h.real!.enLempiras);
  final String entregado = Formatos.lempiras(h.esperado!.enLempiras);
  return FraseVito(
    titular: 'El fiado de hoy va alto',
    detalle: 'De $entregado entregados, $credito quedaron fiados.',
    accion: 'Revisa la cartera antes de soltar más crédito en la ruta.',
  );
}

FraseVito _clienteCerradoRepetido(Hallazgo h) {
  final String cliente = h.clienteNombre ?? 'el cliente';
  return FraseVito(
    titular: '$cliente sigue cerrado a esta hora',
    detalle: 'La ruta le está llegando siempre cuando el local no abre.',
    accion: 'Prueba a reordenar la ruta para caerle en otro horario.',
  );
}

FraseVito _rutaAtrasada(Hallazgo h) {
  final String min = Formatos.cantidad(h.unidades!);
  return FraseVito(
    titular: 'La ruta va atrasada $min minutos',
    detalle: 'A este paso, las últimas paradas se van a atender tarde.',
    accion: 'Avisa a las paradas pendientes o ajusta el orden que queda.',
  );
}

FraseVito _diaLimpio(Hallazgo h) {
  return const FraseVito(
    titular: 'El día cuadró',
    detalle: 'Caja, ventas y parrilla coinciden dentro del margen normal.',
    accion: null,
  );
}

/// Encabezado del panel: cuántas paradas cerradas hay sobre el total.
///
/// Se separa de [redactar] porque no describe un hallazgo puntual, sino el
/// avance del día completo — es lo primero que el dueño lee al abrir el
/// panel, antes de bajar a los hallazgos uno por uno.
String saludo({required int paradasCerradas, required int total}) {
  if (total <= 0) {
    return 'Todavía no hay paradas registradas hoy.';
  }
  if (paradasCerradas >= total) {
    return 'Cerraste las $total paradas de hoy.';
  }
  final String cerradas = Formatos.cantidad(paradasCerradas);
  final String totalTxt = Formatos.cantidad(total);
  return 'Vas $cerradas de $totalTxt paradas cerradas hoy.';
}
