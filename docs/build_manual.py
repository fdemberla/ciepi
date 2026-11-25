# -*- coding: utf-8 -*-
"""Genera el Manual de Administración de CIEPI v1.0 en PDF."""
import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, Image, KeepTogether, NextPageTemplate)
from reportlab.platypus.tableofcontents import TableOfContents

OUT = sys.argv[1]
LOGO = sys.argv[2]

F = "C:/Windows/Fonts/"
pdfmetrics.registerFont(TTFont("Segoe", F + "segoeui.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-B", F + "segoeuib.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-I", F + "segoeuii.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-BI", F + "segoeuiz.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-SB", F + "seguisb.ttf"))
pdfmetrics.registerFontFamily("Segoe", normal="Segoe", bold="Segoe-B", italic="Segoe-I", boldItalic="Segoe-BI")

NAVY = colors.HexColor("#0B3D6E")
ACCENT = colors.HexColor("#E8A317")
INK = colors.HexColor("#1F2933")
MUTED = colors.HexColor("#5B6770")
LINE = colors.HexColor("#D5DCE3")
TINT = colors.HexColor("#EEF3F8")

ss = {
    "body": ParagraphStyle("body", fontName="Segoe", fontSize=10, leading=14.5, textColor=INK, spaceAfter=6),
    "h1": ParagraphStyle("h1", fontName="Segoe-B", fontSize=20, leading=25, textColor=NAVY, spaceBefore=0, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Segoe-SB", fontSize=13.5, leading=18, textColor=NAVY, spaceBefore=12, spaceAfter=5),
    "h3": ParagraphStyle("h3", fontName="Segoe-B", fontSize=10.5, leading=14, textColor=INK, spaceBefore=8, spaceAfter=3),
    "cell": ParagraphStyle("cell", fontName="Segoe", fontSize=9, leading=12, textColor=INK),
    "cellh": ParagraphStyle("cellh", fontName="Segoe-B", fontSize=9, leading=12, textColor=colors.white),
    "step": ParagraphStyle("step", fontName="Segoe", fontSize=10, leading=14, textColor=INK),
    "num": ParagraphStyle("num", fontName="Segoe-B", fontSize=10, leading=14, textColor=colors.white, alignment=TA_CENTER),
    "note": ParagraphStyle("note", fontName="Segoe", fontSize=9.5, leading=13.5, textColor=INK),
    "toc1": ParagraphStyle("toc1", fontName="Segoe-SB", fontSize=11, leading=20, textColor=INK, leftIndent=0),
    "caption": ParagraphStyle("caption", fontName="Segoe-I", fontSize=8.5, leading=11, textColor=MUTED,
                              alignment=TA_CENTER, spaceBefore=4, spaceAfter=10),
    "toc2": ParagraphStyle("toc2", fontName="Segoe", fontSize=9.5, leading=15, textColor=MUTED, leftIndent=18),
}

story = []
_chapter = [0]


def P(text):
    story.append(Paragraph(text, ss["body"]))


def H1(text):
    _chapter[0] += 1
    story.append(PageBreak())
    p = Paragraph(f"{_chapter[0]}. {text}", ss["h1"])
    p._toc = (0, f"{_chapter[0]}. {text}")
    story.append(p)
    story.append(Table([[""]], colWidths=[3 * cm], rowHeights=[3],
                       style=[("BACKGROUND", (0, 0), (-1, -1), ACCENT)], hAlign="LEFT"))
    story.append(Spacer(1, 10))


def H2(text):
    p = Paragraph(text, ss["h2"])
    p._toc = (1, text)
    story.append(p)


def H3(text):
    story.append(Paragraph(text, ss["h3"]))


def steps(items, start=1):
    rows = []
    for i, t in enumerate(items, start):
        rows.append([Paragraph(str(i), ss["num"]), Paragraph(t, ss["step"])])
    t = Table(rows, colWidths=[0.75 * cm, 15.2 * cm], hAlign="LEFT")
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (1, 0), (1, -1), 8),
          ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    for r in range(len(rows)):
        st.append(("BACKGROUND", (0, r), (0, r), NAVY))
    t.setStyle(TableStyle(st))
    story.append(t)
    story.append(Spacer(1, 6))


def bullets(items):
    for it in items:
        story.append(Paragraph(it, ss["body"], bulletText="•"))
    story.append(Spacer(1, 2))


for k in ("body",):
    ss[k].bulletIndent = 6
ss["body"].leftIndent = 0


def bullets(items):  # noqa: F811
    st = ParagraphStyle("bl", parent=ss["body"], leftIndent=16, bulletIndent=4, spaceAfter=3)
    for it in items:
        story.append(Paragraph(it, st, bulletText="•"))
    story.append(Spacer(1, 4))


def table(header, rows, widths):
    data = [[Paragraph(h, ss["cellh"]) for h in header]]
    for r in rows:
        data.append([Paragraph(c, ss["cell"]) for c in r])
    t = Table(data, colWidths=[w * cm for w in widths], repeatRows=1, hAlign="LEFT")
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY),
          ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("GRID", (0, 0), (-1, -1), 0.5, LINE),
          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
          ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6)]
    for r in range(1, len(data)):
        if r % 2 == 0:
            st.append(("BACKGROUND", (0, r), (-1, r), TINT))
    t.setStyle(TableStyle(st))
    story.append(t)
    story.append(Spacer(1, 8))


NOTE_KINDS = {
    "info": (colors.HexColor("#E6F0FA"), NAVY, "Nota"),
    "tip": (colors.HexColor("#E8F5EC"), colors.HexColor("#1E7B3C"), "Consejo"),
    "warn": (colors.HexColor("#FDF3E1"), colors.HexColor("#B26A00"), "Importante"),
}


def note(kind, text):
    bg, bar, label = NOTE_KINDS[kind]
    p = Paragraph(f'<font name="Segoe-B" color="{bar.hexval()}">{label}.</font> {text}', ss["note"])
    t = Table([[p]], colWidths=[15.95 * cm], hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg),
                           ("LINEBEFORE", (0, 0), (0, -1), 3, bar),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(KeepTogether([t, Spacer(1, 8)]))


IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "manual-img")
_fig = [0]


def fig(name, caption, max_h=11.5):
    """Inserta una captura de pantalla con su pie de figura."""
    from PIL import Image as PILImage
    path = os.path.join(IMG_DIR, name + ".png")
    w_px, h_px = PILImage.open(path).size
    w = 15.95 * cm
    h = w * h_px / w_px
    if h > max_h * cm:
        h = max_h * cm
        w = h * w_px / h_px
    _fig[0] += 1
    # Comprime a JPEG (máx. 1600 px de ancho) para que el PDF pese poco.
    import tempfile
    jpg = os.path.join(tempfile.gettempdir(), "ciepi-manual-" + name + ".jpg")
    im = PILImage.open(path).convert("RGB")
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), PILImage.LANCZOS)
    im.save(jpg, "JPEG", quality=82, optimize=True)
    img = Image(jpg, width=w, height=h)
    frame = Table([[img]], colWidths=[w + 4], hAlign="CENTER")
    frame.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE),
                               ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                               ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    cap = Paragraph(f'<font name="Segoe-B">Figura {_fig[0]}.</font> {caption}', ss["caption"])
    story.append(KeepTogether([Spacer(1, 4), frame, cap]))


def b(t):
    return f"<b>{t}</b>"


def ui(t):
    """Texto tal como aparece en pantalla."""
    return f'<font name="Segoe-SB" color="#0B3D6E">«{t}»</font>'


def url(t):
    return f'<font name="Courier" size="9" color="#5B6770">{t}</font>'


# ---------------------------------------------------------------- Documento
class Doc(BaseDocTemplate):
    def afterFlowable(self, f):
        if hasattr(f, "_toc"):
            level, text = f._toc
            key = f"k{id(f)}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=level > 0)
            self.notify("TOCEntry", (level, text, self.page, key))


def cover(c, d):
    w, h = letter
    c.saveState()
    c.setFillColor(NAVY)
    c.rect(0, h * 0.42, w, h * 0.58, stroke=0, fill=1)
    c.setFillColor(ACCENT)
    c.rect(0, h * 0.42 - 6, w, 6, stroke=0, fill=1)
    c.drawImage(LOGO, 2.2 * cm, h - 6.2 * cm, width=3.3 * cm, height=3.75 * cm, mask="auto")
    c.setFillColor(colors.white)
    c.setFont("Segoe", 12)
    c.drawString(2.2 * cm, h - 8.2 * cm, "INADEH · República de Panamá")
    c.setFont("Segoe-B", 34)
    c.drawString(2.2 * cm, h - 10.2 * cm, "Manual de Administración")
    c.setFont("Segoe-SB", 20)
    c.drawString(2.2 * cm, h - 11.4 * cm, "Portal CIEPI")
    c.setFont("Segoe", 11.5)
    c.drawString(2.2 * cm, h - 12.5 * cm, "Centro de Innovación y Emprendimiento Productivo")
    c.setFillColor(INK)
    c.setFont("Segoe-SB", 12)
    c.drawString(2.2 * cm, h * 0.42 - 2.2 * cm, "Guía para el personal encargado de la aplicación")
    c.setFont("Segoe", 10.5)
    c.setFillColor(MUTED)
    y = h * 0.42 - 3.1 * cm
    for line in ["Capacitaciones e inscripciones · Eventos · Blog · Consultas · Newsletter",
                 "Usuarios y roles del portal de administración"]:
        c.drawString(2.2 * cm, y, line)
        y -= 0.6 * cm
    c.setFont("Segoe", 10)
    c.drawString(2.2 * cm, 2.6 * cm, "Versión 1.0 de la aplicación · Noviembre de 2026")
    c.restoreState()


def page(c, d):
    w, h = letter
    c.saveState()
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(2.2 * cm, h - 1.5 * cm, w - 2.2 * cm, h - 1.5 * cm)
    c.setFont("Segoe", 8.5)
    c.setFillColor(MUTED)
    c.drawString(2.2 * cm, h - 1.25 * cm, "Manual de Administración · Portal CIEPI")
    c.drawRightString(w - 2.2 * cm, h - 1.25 * cm, "Versión 1.0")
    c.line(2.2 * cm, 1.5 * cm, w - 2.2 * cm, 1.5 * cm)
    c.drawRightString(w - 2.2 * cm, 1.0 * cm, f"Página {d.page}")
    c.drawString(2.2 * cm, 1.0 * cm, "INADEH · CIEPI")
    c.restoreState()


doc = Doc(OUT, pagesize=letter, leftMargin=2.2 * cm, rightMargin=2.2 * cm, topMargin=2.2 * cm,
          bottomMargin=2.1 * cm, title="Manual de Administración - Portal CIEPI",
          author="INADEH - CIEPI", subject="Manual de uso del portal de administración, versión 1.0")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="cover", frames=[frame], onPage=cover),
                      PageTemplate(id="normal", frames=[frame], onPage=page)])

story.append(NextPageTemplate("normal"))
story.append(PageBreak())
story.append(Paragraph("Contenido", ss["h1"]))
toc = TableOfContents()
toc.levelStyles = [ss["toc1"], ss["toc2"]]
toc.dotsMinLevel = 0
story.append(toc)

# =============================================================== 1
H1("Introducción")
P("Este manual explica, paso a paso, cómo administrar el portal de CIEPI (Centro de Innovación y "
  "Emprendimiento Productivo del INADEH). Está dirigido al personal encargado de publicar "
  "capacitaciones, gestionar inscripciones, publicar eventos y artículos del blog, atender "
  "consultas y dar acceso a nuevos administradores.")
H2("Partes de la aplicación")
table(["Parte", "Dirección", "Para quién"],
      [["Sitio público", url("/") + ", " + url("/capacitaciones") + ", " + url("/eventos") + ", " + url("/blog") + ", " + url("/contacto"),
        "Ciudadanos: consultan la oferta, se inscriben, leen el blog y envían consultas."],
       ["Portal de administración", url("/admin/..."),
        "Personal autorizado: gestiona todo el contenido. Requiere cuenta institucional de Microsoft."]],
      [3.6, 6.2, 6.15])
fig("p_inicio", "Página de inicio del sitio público.")
H2("Convenciones de este manual")
bullets([f"Los textos entre comillas angulares, como {ui('Guardar Cambios')}, son botones, campos o mensajes tal como aparecen en pantalla.",
         f"Las direcciones como {url('/admin/eventos')} se escriben a continuación del dominio del portal.",
         "Los recuadros «Importante» señalan comportamientos que conviene conocer para no cometer errores.",
         "En las capturas, los números en rojo indican dónde hacer clic y en qué orden. Los datos personales "
         "aparecen difuminados o sustituidos por datos de ejemplo."])
H2("Roles del portal")
P("Cada administrador tiene un rol. El rol define qué puede hacer, sobre todo en el blog y en la gestión de usuarios. "
  "Los nombres son los que muestra la pantalla Roles; entre paréntesis, el número de rol:")
table(["Rol", "Pensado para", "Puede hacer"],
      [["Super Administrador (1)", "Responsables del sistema", "Todo, incluida la gestión de usuarios y roles. Puede mover un blog a cualquier estado."],
       ["Administrador (2)", "Responsables del sistema", "Igual que el Super Administrador, salvo cambiar el rol de un usuario existente."],
       ["Editor (3)", "Personal de contenidos de CIEPI", "Escribir artículos del blog y hacer la primera revisión. Gestionar capacitaciones, eventos y consultas."],
       ["Relaciones Públicas (4)", "Equipo de comunicación", "Aprobación final y publicación de artículos del blog. Gestionar capacitaciones, eventos y consultas."]],
      [4.2, 4.0, 7.75])
note("info", "Capacitaciones, inscripciones, eventos, consultas, calendario, sedes, profesores y newsletter están "
     "disponibles para cualquier administrador, sea cual sea su rol. Solo Usuarios y Roles están reservados "
     "a los roles 1 y 2.")

# =============================================================== 2
H1("Acceso al portal de administración")
H2("Iniciar sesión")
steps([f"Abra {url('/admin/login')}. También puede llegar desde el pie de página del sitio, sección «Administración», enlace {ui('Portal Administrativo')}.",
       f"Pulse {ui('Iniciar Sesión con Microsoft')}.",
       "Inicie sesión con su cuenta institucional de Microsoft (la misma del correo del INADEH).",
       f"Al terminar, el portal le lleva a {ui('Gestión de Capacitaciones')} ({url('/admin/capacitaciones')})."])
fig("p_footer", "Enlace «Portal Administrativo» en el pie de página del sitio.")
fig("a_login", "Pantalla de acceso al portal de administración.")
note("warn", "Solo pueden entrar las cuentas que un administrador haya dado de alta en <b>Usuarios</b> y que estén "
     "<b>Activas</b>. Si una persona inicia sesión en Microsoft y vuelve a la pantalla de acceso sin ningún mensaje, "
     "su correo no está registrado (o está escrito de forma distinta). Vea el capítulo 3.")
H2("Menú de administración")
P(f"Una vez dentro, en la barra superior aparece el menú {ui('Admin')} (icono de engranaje). En el celular, "
  f"está dentro del menú principal, sección {ui('ADMINISTRACIÓN')}.")
table(["Opción del menú", "Dirección", "Uso"],
      [["Capacitaciones", url("/admin/capacitaciones"), "Crear y editar cursos; ver inscritos."],
       ["Profesores", url("/admin/profesores"), "Registro de instructores."],
       ["Sedes y Aulas", url("/admin/sedes"), "Sedes, edificios y aulas."],
       ["Calendario", url("/admin/calendario"), "Clases programadas por día."],
       ["Eventos", url("/admin/eventos"), "Crear, modificar y eliminar eventos."],
       ["Consultas", url("/admin/consultas"), "Consultas del formulario de contacto y sus tipos."],
       ["Gestión de Blog", url("/admin/blog"), "Artículos, revisión y publicación."],
       ["Newsletter", url("/admin/newsletter"), "Suscriptores y envío de boletines."],
       ["Usuarios", url("/admin/usuarios"), "Administradores del portal (roles 1 y 2)."],
       ["Roles", url("/admin/roles"), "Roles del sistema (roles 1 y 2)."]],
      [3.6, 4.8, 7.55])
fig("a_menu_admin", "Menú «Admin» desplegado con todos los módulos.")
H2("Uso de las tablas")
bullets(["Haga clic en el encabezado de una columna para ordenar (ascendente y luego descendente).",
         "Las tablas muestran 10 filas por página; use las flechas de abajo para cambiar de página.",
         "Cuando hay buscador, escriba y la tabla se filtra al instante; la «x» limpia la búsqueda."])
H2("Cerrar sesión")
steps(["Haga clic en el círculo con su inicial, arriba a la derecha.",
       f"Pulse {ui('Cerrar Sesión')}."])
fig("a_menu_usuario", "Menú de usuario con la opción «Cerrar Sesión».", max_h=7)
note("tip", "Esto cierra la sesión del portal, pero no la de Microsoft. En equipos compartidos, cierre también la "
     "sesión de Microsoft (o el navegador).")

# =============================================================== 3
H1("Usuarios y roles")
H2("Añadir un nuevo usuario al portal de administración")
P("Requiere rol Super Administrador o Administrador.")
steps([f"En el menú {ui('Admin')}, abra {ui('Usuarios')}.",
       f"Pulse {ui('Crear Usuario')}.",
       "Complete el formulario (todos los campos son obligatorios):"])
fig("a_usuarios_lista", "Pantalla «Gestión de Usuarios» y botón «Crear Usuario».")
table(["Campo", "Qué escribir"],
      [[ui("Correo Electrónico"), "El correo institucional de Microsoft de la persona, exactamente igual a como lo usa para iniciar sesión."],
       [ui("Nombre") + " / " + ui("Apellido"), "Nombre y apellido de la persona."],
       [ui("Rol"), "El rol que tendrá (ver capítulo 1)."],
       [ui("Estado"), f"{ui('Activo')} para que pueda entrar ya; {ui('Inactivo')} para crearlo sin acceso."]],
      [4.5, 11.45])
steps(start=4, items=[f"Pulse {ui('Crear Usuario')}. Verá el mensaje {ui('Usuario creado exitosamente')}.",
       "Avise a la persona: ya puede entrar en el portal con su cuenta de Microsoft. El sistema no envía invitación por correo."])
fig("a_usuarios_crear", "Formulario «Crear Nuevo Usuario» completo, listo para guardar.", max_h=13)
note("warn", "Escriba el correo <b>todo en minúsculas</b> y sin espacios, tal como aparece en la cuenta de Microsoft. "
     "El sistema compara el correo letra por letra: «Juan.Perez@...» y «juan.perez@...» se consideran distintos. "
     "La cuenta debe existir en el directorio de Microsoft del INADEH; el portal no la crea.")
P("Posibles mensajes de error: " + ui("Ya existe un usuario con este correo electrónico") + ", " +
  ui("Formato de correo electrónico inválido") + ".")
H2("Modificar un usuario")
steps([f"En {ui('Usuarios')}, pulse el icono de lápiz ({ui('Editar usuario')}) de la persona.",
       "Cambie nombre, apellido, rol o estado. El correo no se puede modificar.",
       f"Pulse {ui('Guardar Cambios')}."])
fig("a_usuarios_editar", "Edición de un usuario: el campo Estado (1) y «Guardar Cambios» (2).", max_h=13)
note("info", "Solo el Super Administrador puede cambiar el rol de un usuario existente. El rol de un usuario "
     "Super Administrador o Administrador no se puede cambiar desde la pantalla, por seguridad.")
H2("Quitar el acceso a un usuario")
P("Los usuarios no se eliminan: se desactivan, para conservar el historial.")
steps(["Abra la edición del usuario.",
       f"Cambie {ui('Estado')} a {ui('Inactivo')} y pulse {ui('Guardar Cambios')}."])
note("warn", "Si la persona tiene una sesión abierta, puede seguir usándola hasta que cierre sesión o caduque "
     "(hasta 30 días). Si necesita cortar el acceso de inmediato, pida al equipo técnico que lo invalide. "
     "Nunca desactive su propia cuenta ni la del último administrador activo.")
H2("Roles")
P(f"En {ui('Roles')} ({url('/admin/roles')}) se ven los roles existentes, cuántos usuarios tiene cada uno y, más abajo, "
  f"{ui('Usuarios por Rol')}.")
fig("a_roles", "Pantalla «Administración de Roles».")
bullets([f"{b('Crear un rol:')} pulse {ui('Nuevo Rol')}, escriba el {ui('Nombre del Rol')} y pulse {ui('Crear')}.",
         f"{b('Editar un rol:')} pulse {ui('Editar')}, cambie el nombre o la casilla {ui('Activo')} y pulse {ui('Guardar')}. "
         "Los roles 1 y 2 no se pueden editar.",
         "Los roles no se eliminan. Desactivar un rol solo lo oculta al crear o editar usuarios."])
fig("a_roles_nuevo", "Ventana «Nuevo Rol».", max_h=8)
note("warn", "En esta versión los permisos están definidos por el sistema para los cuatro roles predeterminados. "
     "Un rol nuevo no recibe permisos de blog ni de gestión de usuarios: sus miembros solo podrán usar los "
     "módulos abiertos a todos los administradores. Use los cuatro roles existentes salvo indicación del equipo técnico.")

# =============================================================== 4
H1("Sedes, aulas y profesores")
P("Antes de crear capacitaciones presenciales conviene registrar las sedes, sus aulas y los profesores, "
  "para poder asignarlos en el formulario. No es obligatorio: una capacitación puede crearse sin sede ni profesor.")
H2("Sedes, edificios y aulas")
steps([f"Abra {ui('Sedes y Aulas')} ({url('/admin/sedes')}).",
       f"En {ui('Agregar Nueva Sede')} escriba el nombre (obligatorio), un código corto (p. ej. TOC) y la dirección. Pulse {ui('Crear Sede')}.",
       f"Dentro de la sede, escriba el nombre del edificio y pulse {ui('+ Agregar Edificio')}.",
       f"Dentro del edificio, escriba el nombre del aula, los cupos y el tipo (Aula, Laboratorio, Taller, Auditorio o Virtual). Pulse {ui('+ Aula')}."])
fig("a_sedes", "Sedes, edificios y aulas: crear sede, agregar edificio y agregar aula.", max_h=13)
note("warn", "En esta versión las sedes, edificios y aulas no se pueden editar desde la pantalla: si se equivoca, "
     "elimine y vuelva a crear. <b>Eliminar una sede borra todos sus edificios y aulas</b> y deja sin ubicación a las "
     "capacitaciones que la usaban. Esta acción no se puede deshacer.")
H2("Profesores")
steps([f"Abra {ui('Profesores')} ({url('/admin/profesores')}) y pulse {ui('Nuevo Profesor')}.",
       f"Complete {ui('Nombre')} y {ui('Apellido')} (obligatorios) y, si los tiene, cédula (dato confidencial de uso interno), correo, teléfono, {ui('Especialidad / Área')} y {ui('Biografía breve')}.",
       f"Deje marcada {ui('Profesor activo')} y pulse {ui('Guardar')}."])
fig("a_profesores", "Listado de profesores y botón «Nuevo Profesor».")
fig("a_profesores_nuevo", "Ventana «Nuevo Profesor».", max_h=12)
bullets([f"Para modificar: {ui('Editar')} en la fila del profesor. Al editar, deje la cédula vacía para conservar la registrada.",
         f"Si un profesor deja de colaborar, desmarque {ui('Profesor activo')} en lugar de eliminarlo.",
         f"{ui('Eliminar')} es definitivo y lo desvincula de todas sus capacitaciones."])

# =============================================================== 5
H1("Capacitaciones")
H2("Crear una capacitación")
steps([f"Abra {ui('Capacitaciones')} ({url('/admin/capacitaciones')}).",
       f"Pulse {ui('+ Nueva Capacitación')}.",
       "Complete el formulario. Los campos marcados con * son obligatorios:"])
fig("a_cap_lista", "Pantalla «Gestión de Capacitaciones» y botón «+ Nueva Capacitación».")
table(["Sección / campo", "Obligatorio", "Indicaciones"],
      [[ui("Banner de la capacitación"), "No", "Imagen jpg, jpeg, png o webp. Es la imagen de la tarjeta en el sitio público."],
       [ui("Nombre de Capacitación"), "Sí", "Nombre del curso. Admite tildes, ñ, números y signos."],
       [ui("Descripción"), "No", "Editor con formato (negrita, listas, títulos, enlaces)."],
       [ui("Cantidad de horas"), "Sí", "Duración total en horas."],
       [ui("Cantidad de participantes"), "Sí", "Cupo del curso (informativo; ver anexo)."],
       [ui("Adjuntar archivos"), "No", "Material descargable. Use un solo archivo PDF, DOC o DOCX."],
       [ui("Inicio / Fin de Inscripción"), "Sí", "Periodo en que los ciudadanos pueden inscribirse."],
       [ui("Inicio / Fin de Capacitación"), "Sí", "Periodo en que se imparte el curso."],
       [ui("Modalidad"), "No", "Presencial, Virtual o Híbrida."],
       ["Sede, Edificio y Aula", "No", "Se eligen en cascada. Solo aparecen los registrados y activos (capítulo 4)."],
       ["Horarios de Clases", "No", f"Pulse {ui('Agregar día')} por cada día de clase e indique hora de inicio y fin. Alimenta el Calendario."],
       ["Profesores Asignados", "No", "Marque uno o varios profesores."]],
      [4.4, 2.4, 9.15])
fig("a_cap_crear_1", "Formulario de creación: banner, nombre y descripción.")
fig("a_cap_crear_2", "Horas, participantes, adjuntos y fechas de inscripción y de capacitación.")
fig("a_cap_crear_3", "Modalidad, sede/edificio/aula y horarios de clase.")
fig("a_cap_crear_4", "Profesores asignados y botón «Guardar».")
steps(start=4, items=[f"Pulse {ui('Guardar')}. Verá {ui('Capacitación creada exitosamente')} y volverá al listado."])
note("tip", "Revise las fechas antes de guardar: el sistema no comprueba que el fin sea posterior al inicio. "
     "Si un horario tiene la hora de fin igual o anterior a la de inicio, se descarta sin aviso. "
     f"Registre sedes y profesores <b>antes</b> de abrir el formulario: los enlaces {ui('Gestionar sedes y aulas →')} "
     "y {ui('Gestionar profesores →')} salen del formulario y se pierde lo escrito.")
fig("a_cap_creada", "La nueva capacitación aparece primera en el listado del portal.")
H2("Cuándo se ve en el sitio público")
bullets(["La capacitación queda <b>Activa</b> al crearla y aparece de inmediato en " + url("/capacitaciones") + ".",
         "Se muestra mientras esté activa y no haya pasado la fecha de fin de inscripción.",
         "Los ciudadanos solo pueden inscribirse entre la fecha de inicio y la de fin de inscripción.",
         "No existe modo borrador: si aún no quiere publicarla, créela y márquela como Inactiva enseguida."])
fig("p_capacitaciones", "Catálogo público de capacitaciones (/capacitaciones).")
H2("Modificar una capacitación")
steps([f"En el listado, pulse {ui('Editar')} en la tarjeta de la capacitación.",
       "Cambie los campos necesarios. Si no sube un banner o archivo nuevo, se conservan los anteriores; si sube uno, reemplaza al anterior.",
       f"Pulse {ui('Guardar Cambios')}. Verá {ui('Capacitación actualizada exitosamente')}."])
fig("a_cap_tarjeta", "Botones «Editar» (1) y «Ver Detalles» (2) de cada capacitación.")
H2("Activar, desactivar o retirar una capacitación")
P("Las capacitaciones no se eliminan. Para retirarla del sitio público:")
steps([f"Abra {ui('Editar')}.",
       f"En {ui('Estado de la Capacitación')}, elija {ui('Inactiva')} y pulse {ui('Guardar Cambios')}."])
fig("a_cap_editar_estado", "Sección «Estado de la Capacitación» en la edición.")
note("info", "El listado del portal muestra <b>todas</b> las capacitaciones: activas, inactivas y con la "
     "inscripción ya cerrada. Así puede seguir gestionando sus inscritos (matricular, marcar «Terminó curso») "
     "después del cierre de inscripción.")

# =============================================================== 6
H1("Gestión de inscripciones")
H2("Ver los inscritos de una capacitación")
steps([f"En {ui('Capacitaciones')}, pulse {ui('Ver Detalles')} en la tarjeta.",
       f"Arriba verá los totales: {ui('Total Inscritos')}, {ui('Pendientes Validación')}, {ui('Matriculados')}, {ui('Rechazados')} y {ui('Terminaron')}.",
       f"Use el filtro {ui('Todos los estados')} para ver un estado concreto y el buscador {ui('Buscar por nombre, cédula o correo...')} para localizar a una persona."])
fig("a_cap_detalles", "Página de inscritos: totales por estado, filtro, buscador y tabla. Los datos personales se han difuminado.")
P(f"La tabla muestra el estudiante y su cédula, contacto (con marca si el correo está verificado), el tipo de "
  f"{ui('Validación Identidad')} ({ui('Biométrica')} o {ui('Manual / Presencial')}), el estado, la ubicación y la fecha.")
note("info", "Una inscripción aparece aquí solo después de que el ciudadano confirme su correo electrónico (capítulo 7).")
H2("Estados de una inscripción")
table(["Estado", "Significa", "Puede pasar a"],
      [["Nueva inscripción", "Identidad validada por biometría y correo verificado.", "Pendiente de validación, Matriculado, Rechazado"],
       ["Pendiente de validación", "El ciudadano eligió validación manual/presencial. Un administrador debe comprobar su identidad.", "Matriculado, Rechazado, Nueva inscripción"],
       ["Matriculado", "Aceptado en el curso.", "Terminó curso, Retirado"],
       ["Rechazado", "No admitido.", "Estado final (solo se reabre por un administrador)"],
       ["Retirado", "Estaba matriculado y dejó el curso o fue dado de baja.", "Estado final (solo se reabre por un administrador)"],
       ["Terminó curso", "Completó la capacitación.", "Estado final"]],
      [3.7, 6.6, 5.65])
H2("Cambiar el estado de una inscripción")
steps([f"En {ui('Ver Detalles')}, haga clic en la etiqueta de la columna {ui('Estado')} de la persona.",
       f"En la ventana {ui('Cambiar Estado de Inscripción')}, elija el nuevo estado.",
       f"Pulse {ui('Confirmar Cambio')}. Verá el mensaje «Estado actualizado a ...»."])
fig("a_cap_detalles_estado", "Haga clic en la etiqueta de estado de la persona para cambiarlo.", max_h=6)
fig("a_cap_cambiar_estado", "Ventana «Cambiar Estado de Inscripción».")
note("warn", "La ventana muestra todos los estados, pero solo se aceptan los cambios de la tabla anterior. Si elige uno "
     "no permitido verá «Error al actualizar el estado». Los totales de arriba se actualizan al recargar la página.")
note("info", "El sistema <b>no envía correo</b> al ciudadano cuando cambia su estado. Si debe avisarle "
     "(matrícula, rechazo), hágalo por correo o teléfono con los datos de la columna Contacto.")
H2("Validar una inscripción pendiente")
steps([f"Filtre por {ui('Pendiente de validación')}.",
       "Compruebe la identidad de la persona (presencialmente o con la documentación que establezca CIEPI).",
       f"Cambie el estado a {ui('Matriculado')} si es correcta, o a {ui('Rechazado')} si no lo es."])
H2("Eliminar o dar de baja a una persona inscrita")
P("Las inscripciones no se borran; se cierran con un estado, para conservar el historial:")
bullets([f"Si aún no estaba matriculada (Nueva o Pendiente): cambie el estado a {ui('Rechazado')}.",
         f"Si ya estaba matriculada: cambie el estado a {ui('Retirado')}."])
note("warn", "Una persona Rechazada o Retirada <b>no puede volver a inscribirse</b> en la misma capacitación "
     "(verá «Ya está inscrito en esta capacitación»). Si fue un error, un Super Administrador o Super "
     "Administrador puede reabrirla: Rechazado pasa a Pendiente de validación y Retirado pasa a Matriculado.")
H2("Cerrar el curso")
P(f"Al terminar la capacitación, cambie a {ui('Terminó curso')} a cada persona matriculada que la completó, y a "
  f"{ui('Retirado')} a quien no. Este estado ya no se puede modificar.")

# =============================================================== 7
H1("Cómo se inscribe un ciudadano")
P("Este capítulo describe lo que ve el ciudadano, para poder orientarle por teléfono o en persona.")
steps([f"Entra en {url('/capacitaciones')}, elige un curso y pulsa {ui('Más Información')}.",
       f"En la página del curso pulsa {ui('Inscríbete Ahora')}.",
       f"<b>Paso 1 – Cédula.</b> Escribe su número de cédula (ej. 8-123-456), acepta la Política de Privacidad, completa la verificación de seguridad y pulsa {ui('Validar Cédula y Continuar')}. El sistema consulta el Tribunal Electoral.",
       f"Confirma su <b>fecha de nacimiento</b> en formato DD/MM/AAAA y pulsa {ui('Confirmar y Continuar')}.",
       f"<b>Paso 2 – Validación.</b> Elige {ui('Realizar Validación Biométrica')} (reconocimiento facial, inmediato y recomendado) o {ui('Continuar con Validación Manual / Presencial')} (quedará pendiente de que un administrador la valide).",
       "<b>Paso 3 – Datos.</b> Sus datos personales vienen del Tribunal Electoral y no se editan. Completa correo, teléfono (6666-6666), provincia, distrito, corregimiento y dirección, acepta la política y pulsa " + ui("Completar Inscripción") + ".",
       f"Recibe el correo {ui('Verifica tu correo electrónico - CIEPI')} y pulsa {ui('Verificar mi Correo')} <b>antes de 15 minutos</b>. Si no le llegó, puede usar {ui('Reenviar Correo de Verificación')}.",
       "Al verificar el correo la inscripción queda registrada: como <b>Nueva inscripción</b> (biometría) o <b>Pendiente de validación</b> (manual)."])
fig("p_capacitacion_inscribete", "Página pública de la capacitación con el botón «Inscríbete Ahora».")
fig("p_inscripcion_paso1", "Paso 1 de la inscripción: cédula, Política de Privacidad y verificación de seguridad.", max_h=14)
H2("Mensajes frecuentes y qué hacer")
table(["Mensaje que ve el ciudadano", "Causa y solución"],
      [["Cédula no encontrada en el sistema nacional", "Revisar el formato de la cédula (con guiones)."],
       ["La fecha de nacimiento ingresada no coincide con nuestros registros.", "Revisar la fecha (DD/MM/AAAA)."],
       ["Este correo electrónico ya está registrado", "El correo pertenece a otra persona registrada; usar otro correo."],
       ["Ya está inscrito en esta capacitación", "Ya tiene una inscripción en ese curso (también si fue rechazada o retirada). Ver capítulo 6."],
       ["El período de inscripción aún no ha iniciado / ha finalizado", "Fuera de las fechas de inscripción del curso."],
       ["Esta capacitación no está disponible para inscripciones", "La capacitación está Inactiva."],
       ["El enlace de verificación ha expirado", "Pasaron más de 15 minutos; repetir la inscripción o reenviar el correo."]],
      [7.4, 8.55])
note("warn", "En esta versión el sistema no limita las inscripciones al cupo indicado en «Cantidad de participantes», "
     "y la cifra «Cupos disponibles» muestra el cupo total. Vigile el número de matriculados en Ver Detalles.")

# =============================================================== 8
H1("Calendario de clases")
P(f"{ui('Calendario')} ({url('/admin/calendario')}) muestra las clases de las capacitaciones activas, según los "
  "horarios definidos en cada una. Es de solo consulta.")
bullets([f"Use {ui('Hoy')}, {ui('Mes anterior')} y {ui('Mes siguiente')} para navegar.",
         f"Filtre con {ui('Todas las sedes')} y {ui('Todas las modalidades')}. Los colores indican Presencial, Virtual o Híbrida.",
         "Cada clase muestra horario, sede · edificio · aula y profesores. Si la capacitación no tiene horario, aparece solo su día de inicio.",
         "Al hacer clic en una clase se abre la página de inscritos de esa capacitación."])
fig("a_calendario", "Calendario de clases: las sesiones de lunes y miércoles de la capacitación de ejemplo.")
note("info", "Los eventos no aparecen en este calendario; tienen su propia vista en el sitio público.")

# =============================================================== 9
H1("Eventos")
H2("Crear un evento")
steps([f"Abra {ui('Eventos')} ({url('/admin/eventos')}) y pulse {ui('Crear Evento')}.",
       "Complete el formulario:"])
fig("a_eventos_lista", "Pantalla «Gestión de Eventos» y botón «Crear Evento».")
table(["Campo", "Obligatorio", "Indicaciones"],
      [[ui("Nombre del Evento"), "Sí", "Título que verá el público."],
       [ui("Ubicación"), "No", "Lugar o enlace de la reunión."],
       [ui("Fecha de Inicio"), "Sí", "Fecha y hora de inicio."],
       [ui("Fecha de Fin"), "Sí", "Fecha y hora de fin (debe ser posterior al inicio)."],
       [ui("Descripción"), "No", "Texto sin formato; en la tarjeta se ven las 3 primeras líneas."],
       [ui("Banner del Evento"), "No", "Imagen PNG o JPG de hasta 5 MB."]],
      [4.0, 2.4, 9.55])
steps(start=3, items=[f"Pulse {ui('Crear Evento')}. Volverá al listado y el evento ya es público en {url('/eventos')}."])
fig("a_eventos_crear", "Formulario «Crear Nuevo Evento» completo.", max_h=13)
fig("p_eventos", "El evento publicado en la página pública de eventos.")
note("info", "El estado del evento se calcula solo con las fechas: «Próximamente», «En Curso Ahora» o «Evento Pasado». "
     "No hace falta cambiarlo a mano. No existe modo borrador: el evento se publica al crearlo.")
H2("Modificar un evento")
steps([f"En el listado, use el buscador {ui('Buscar eventos...')} si es necesario y pulse el lápiz ({ui('Editar')}).",
       "Cambie los datos. Si no sube una imagen nueva, se conserva el banner anterior.",
       f"Pulse {ui('Guardar Cambios')}."])
fig("a_eventos_acciones", "Iconos «Editar» (1) y «Eliminar» (2) de cada evento.", max_h=6)
fig("a_eventos_editar", "Edición de un evento: las horas se muestran tal como se guardaron.", max_h=13)
note("warn", "Si al guardar no vuelve al listado, el cambio no se guardó: revise los datos e inténtelo de nuevo.")
H2("Eliminar un evento")
steps(["Pulse la papelera (" + ui("Eliminar") + ") en la fila del evento.",
       f"Confirme con {ui('Eliminar')} en la ventana {ui('Eliminar Evento')}. Esta acción no se puede deshacer."])

# =============================================================== 10
fig("a_eventos_eliminar", "Ventana de confirmación para eliminar un evento.")
H1("Blog")
H2("Flujo de publicación")
P("Un artículo pasa por dos revisiones antes de publicarse:")
table(["Estado", "Quién actúa", "Siguiente paso"],
      [["1. Borrador", "Autor", "Enviar a «En Revisión CIEPI»."],
       ["2. En Revisión CIEPI", "Rol Editor o administrador", "Aprobar (pasa a revisión de Relaciones Públicas) o rechazar."],
       ["3. Rechazado por CIEPI", "Autor", "Corregir y volver a Borrador."],
       ["4. En Revisión Relaciones Públicas", "Rol Relaciones Públicas o administrador", "Publicar o rechazar."],
       ["5. Rechazado por Relaciones Públicas", "Autor", "Corregir y volver a Borrador."],
       ["6. Publicado", "—", "Visible en " + url("/blog") + "."]],
      [5.2, 4.8, 5.95])
note("info", "Pueden escribir artículos los roles Editor, Super Administrador y Administrador. Solo estos dos "
     "últimos pueden eliminar artículos. El sistema no envía correos en este flujo: avise al revisor o al autor por los canales habituales.")
fig("a_blog_lista", "Pantalla «Gestión de Blog»: «Crear Blog» (1) y «Aprobar Blogs» (2).")
H2("Crear un artículo")
steps([f"Abra {ui('Gestión de Blog')} ({url('/admin/blog')}) y pulse {ui('Crear Blog')}.",
       f"En {ui('¿Qué deseas hacer con este blog?')} elija {ui('Guardar como borrador')} (para seguir trabajándolo) o {ui('Enviar a revisión CIEPI')} (si ya está listo).",
       f"Escriba el {ui('Título del Blog')} (obligatorio).",
       f"Opcional: cargue una {ui('Imagen Banner')} (PNG, JPG, GIF o WEBP, hasta 5 MB).",
       f"Opcional: añada {ui('Palabras Clave')}: escriba una palabra y pulse Enter o {ui('Agregar')}. Ayudan a encontrar el artículo en el buscador del blog.",
       f"Escriba el {ui('Contenido del Blog')} (obligatorio). La barra permite negrita, cursiva, subrayado, alineación, listas, títulos, sangría, enlaces, color y tamaño de letra.",
       f"Pulse {ui('Guardar Borrador')} o {ui('Enviar a Revisión')}, según lo que eligió."])
fig("a_blog_crear_1", "Elija qué hacer con el artículo y complete título e imagen.")
fig("a_blog_crear_2", "Botón final: «Enviar a Revisión» o «Guardar Borrador».", max_h=8)
fig("a_blog_creado", "El artículo queda «En Revisión CIEPI»; el lápiz permite editarlo.")
H2("Enviar a revisión un borrador")
P("Si guardó el artículo como borrador, cuando esté listo:")
steps([f"En {ui('Gestión de Blog')}, pulse {ui('Editar blog')} en su artículo.",
       f"Pulse {ui('Cambiar Estado')}, elija {ui('En Revisión CIEPI')}, añada un comentario si quiere y pulse {ui('Confirmar cambio')}."])
fig("a_blog_editar", "Edición de un artículo y botón «Cambiar Estado».")
fig("a_blog_cambiar_estado", "Ventana «Cambiar estado del blog».")
H2("Modificar un artículo")
steps([f"En {ui('Gestión de Blog')}, pulse {ui('Editar blog')} (solo aparece para el autor).",
       "Haga los cambios. La imagen banner actual se conserva si no carga otra.",
       f"Pulse {ui('Actualizar Blog')}."])
note("warn", "Si el autor edita un artículo ya <b>Publicado</b>, los cambios se ven en el sitio de inmediato, sin nueva "
     "revisión. Para cambios importantes, pase antes el artículo a Borrador (lo puede hacer un administrador) y repita el flujo.")
H2("Revisar y aprobar artículos")
steps([f"En {ui('Gestión de Blog')}, pulse {ui('Aprobar Blogs')}.",
       f"El filtro {ui('Pendientes de aprobación')} muestra los artículos que esperan revisión de CIEPI o de Relaciones Públicas.",
       "Lea el artículo con " + ui("Ver/Editar blog") + " antes de decidir.",
       f"Revisión CIEPI (estado 2): pulse {ui('Aprobar y enviar a RR.PP')} o {ui('Rechazar blog')}. Escriba un comentario y pulse {ui('Confirmar')}.",
       f"Revisión de Relaciones Públicas (estado 4): pulse {ui('Publicar directamente')} o {ui('Rechazar blog')} y confirme."])
fig("a_blog_aprobar", "Bandeja «Aprobar Blogs»: aprobar y enviar a RR.PP. (1) o rechazar (2).")
fig("a_blog_aprobar_modal", "Confirmación de la aprobación, con comentario opcional.", max_h=8)
note("warn", "En esta versión la pantalla «Revisar y aprobar detalladamente» no muestra el contenido del "
     "artículo; lea el artículo con «Ver/Editar blog». Los comentarios de rechazo se guardan pero el autor no los ve: "
     "comuníquele los motivos directamente.")
fig("p_blog", "Los artículos publicados aparecen en el blog público.")
H2("Corregir un artículo rechazado")
P(f"El autor abre {ui('Editar blog')}, corrige, y con {ui('Cambiar Estado')} lo pasa a {ui('Borrador')} y luego a "
  f"{ui('En Revisión CIEPI')}. (El botón {ui('Reenviar a revisión')} de la bandeja de aprobación solo funciona para administradores.)")
H2("Eliminar un artículo")
P(f"Super Administrador o Administrador: en {ui('Gestión de Blog')}, pulse {ui('Eliminar blog')} y confirme. "
  "Es definitivo; si solo quiere retirarlo del sitio, cambie su estado a Borrador.")

# =============================================================== 11
H1("Consultas del formulario de contacto")
P(f"Los ciudadanos envían consultas desde {url('/contacto')} indicando nombre, correo, teléfono, tipo de consulta, "
  "sede, área, curso de interés y comentarios. Cada consulta llega al portal como <b>Pendiente</b>.")
fig("p_contacto", "Formulario público de contacto.", max_h=14)
H2("Atender una consulta")
steps([f"Abra {ui('Consultas')} ({url('/admin/consultas')}). Las pendientes aparecen primero.",
       f"Pulse {ui('Ver detalles y responder')} en la consulta.",
       "Lea los datos y comentarios del ciudadano.",
       f"<b>Responda al ciudadano por correo electrónico o teléfono</b> desde su propio buzón.",
       f"En la ventana, escriba en {ui('Respuesta')} un resumen de lo que contestó, elija el {ui('Estado')} ({ui('En Proceso')}, {ui('Respondida')} o {ui('Cerrada')}) y pulse {ui('Enviar Respuesta')}."])
fig("a_consultas_lista", "Listado de consultas: ver y responder (1) y «Gestionar Tipos» (2). Datos personales difuminados.")
fig("a_consultas_detalle", "Ventana «Detalles de la Consulta» con Estado y Respuesta.")
note("warn", "En esta versión el portal <b>no envía</b> la respuesta por correo: solo la guarda como registro, aunque el "
     "mensaje diga «Respuesta enviada exitosamente». Recuerde también cambiar el estado: si lo deja en Pendiente, "
     "la consulta seguirá pendiente.")
bullets([f"{ui('Eliminar consulta')} la borra definitivamente (por ejemplo, spam)."])
H2("Tipos de consulta")
P(f"Son las opciones de la lista «Tipo de consulta» del formulario público. Se gestionan con {ui('Gestionar Tipos')} dentro de Consultas.")
steps([f"Pulse {ui('Nuevo Tipo')}, escriba el {ui('Nombre')} (p. ej. «Consulta General») y una descripción opcional.",
       f"Deje marcada {ui('Activo (visible en el formulario público)')} y pulse {ui('Crear')}."])
fig("a_tipos_lista", "Pantalla «Tipos de Consulta».")
fig("a_tipos_nuevo", "Ventana «Nuevo Tipo de Consulta».", max_h=9)
bullets([f"Para modificar: {ui('Editar')}, cambie y pulse {ui('Actualizar')}.",
         "Para retirarlo del formulario sin perder el historial: desmarque «Activo».",
         "Solo se puede eliminar un tipo que ninguna consulta haya usado."])

# =============================================================== 12
H1("Newsletter")
H2("Cómo se suscriben los ciudadanos")
bullets(["En el pie de todas las páginas hay un formulario «Suscríbete al Newsletter de CIEPI».",
         "El ciudadano escribe su correo, acepta la Política de Privacidad (Ley 81 de 2019) y pulsa «Suscribirme».",
         "Recibe un correo para confirmar (válido 24 horas). Hasta confirmar queda como <b>Pendiente</b>; al confirmar, <b>Activo</b>.",
         "Cada boletín incluye un enlace «Darse de baja» de un clic."])
H2("Enviar un boletín")
steps([f"Abra {ui('Newsletter')} ({url('/admin/newsletter')}), pestaña {ui('Redactar Boletín')}.",
       f"Escriba el {ui('Asunto del boletín')}.",
       f"Redacte el {ui('Contenido del boletín')} con el editor. El enlace de baja y la política de privacidad se añaden solos.",
       "<b>Revise con cuidado asunto y contenido.</b>",
       f"Pulse {ui('Enviar a N suscriptor(es) activo(s)')}. Verá cuántos se enviaron correctamente."])
fig("a_news_redactar", "Pestaña «Redactar Boletín». El botón (1) envía de inmediato.", max_h=13)
note("warn", "El envío es <b>inmediato y sin confirmación</b>: se envía a todos los suscriptores activos en cuanto pulsa el "
     "botón. Después del envío, recargue la página antes de redactar el siguiente boletín.")
H2("Suscriptores e historial")
bullets([f"{ui('Suscriptores')}: lista con filtro por estado y botón {ui('Exportar CSV')}.",
         f"{ui('Historial de Envíos')}: fecha, asunto, enviados, fallidos y quién envió cada boletín.",
         "Las bajas las hace el propio suscriptor desde el enlace del correo."])

# =============================================================== 13
fig("a_news_suscriptores", "Pestaña «Suscriptores» con el botón «Exportar CSV».")
fig("a_news_historial", "Pestaña «Historial de Envíos».")
H1("Preguntas frecuentes")
faq = [
    ("Una persona nueva no puede entrar al portal.",
     "Compruebe en Usuarios que su correo está registrado, escrito en minúsculas y exactamente igual al de Microsoft, y que su estado es Activo."),
    ("Desactivé a un usuario, pero sigue dentro.",
     "La sesión abierta sigue vigente hasta que la cierre o caduque. Pida al equipo técnico que la invalide si es urgente."),
    ("Quiero eliminar a una persona inscrita.",
     "Cambie su estado a Rechazado (si no estaba matriculada) o Retirado (si lo estaba)."),
    ("Un ciudadano dice que ya está inscrito, pero lo rechazamos por error.",
     "Un Super Administrador o Administrador puede reabrir la inscripción: Rechazado pasa a Pendiente de validación."),
    ("El ciudadano no recibió el correo de verificación.",
     "Que revise spam y use «Reenviar Correo de Verificación» en la pantalla de espera. El enlace vale 15 minutos."),
    ("Mi artículo del blog no aparece para revisión.",
     "Probablemente se guardó como Borrador: use Editar blog > Cambiar Estado > En Revisión CIEPI."),
]
for q, a in faq:
    story.append(KeepTogether([Paragraph(q, ss["h3"]), Paragraph(a, ss["body"])]))

# =============================================================== Anexo
H1("Anexo: limitaciones conocidas de la versión 1.0")
P("Estas situaciones están identificadas para próximas versiones. Mientras tanto, siga las indicaciones de este manual.")
table(["Área", "Limitación", "Cómo proceder"],
      [["Acceso", "Si la cuenta no está autorizada no se muestra ningún mensaje.", "Verificar el usuario en Usuarios."],
       ["Usuarios", "«Último Acceso» siempre dice «Nunca».", "Dato informativo; no afecta al acceso."],
       ["Usuarios", "Desactivar no cierra la sesión abierta.", "Solicitar invalidación al equipo técnico."],
       ["Capacitaciones", "Solo se guarda el primer archivo adjunto; los Excel se rechazan.", "Adjuntar un único PDF, DOC o DOCX."],
       ["Capacitaciones", "No se controla el cupo.", "Vigilar el número de matriculados."],
       ["Inscripciones", "No se envían correos al cambiar de estado.", "Avisar al ciudadano manualmente."],
       ["Inscripciones", "No hay exportación de inscritos.", "Solicitar el reporte al equipo técnico."],
       ["Blog", "La revisión detallada no muestra el contenido; los comentarios no son visibles para el autor.", "Ver capítulo 10."],
       ["Consultas", "La respuesta no se envía por correo.", "Responder desde el correo institucional."],
       ["Newsletter", "Envío sin confirmación.", "Revisar el boletín antes de enviarlo."],
       ["Sedes", "No se pueden editar; eliminar borra en cascada.", "Eliminar y volver a crear con cuidado."]],
      [2.9, 7.2, 5.85])

doc.multiBuild(story)
print("OK", OUT)
