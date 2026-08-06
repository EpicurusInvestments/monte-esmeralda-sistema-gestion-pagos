"""Seed data for the hierarchical Concept Catalog (Concepto de Flujo).

Structure: each node is (code, name, is_header, children). The top-level node's
code is also used as the `section` for the entire subtree.
"""
from __future__ import annotations

# A node is a 4-tuple: (code, name, is_header, [children]).
CATALOG: list[tuple] = [
    (
        "ING",
        "INGRESOS",
        True,
        [
            ("ING.VN", "Ventas", True, [
                ("ING.VN.001", "Venta de viviendas", False, []),
            ]),
            ("ING.OI", "Otros Ingresos", True, [
                ("ING.OI.001", "Otros", False, []),
            ]),
        ],
    ),
    (
        "EGR",
        "EGRESOS — COSTOS",
        True,
        [
            ("EGR.CI", "Costos Indirectos", True, [
                ("EGR.CI.OF", "Indirectos de Oficina / Corporativo", True, [
                    ("EGR.CI.001", "Municipal", False, []),
                    ("EGR.CI.002", "Estatal", False, []),
                    ("EGR.CI.003", "Federal", False, []),
                    ("EGR.CI.004", "Particulares", False, []),
                    ("EGR.CI.005", "Papelería", False, []),
                    ("EGR.CI.006", "Oficina", False, []),
                    ("EGR.CI.007", "Nómina", False, []),
                    ("EGR.CI.008", "Supervisión Administrativa", False, []),
                    ("EGR.CI.009", "Servicios", False, []),
                    ("EGR.CI.010", "Licencias y sistemas", False, []),
                    ("EGR.CI.011", "Compra de tierra", False, []),
                    ("EGR.CI.012", "Impuestos de terreno", False, []),
                ]),
                ("EGR.CI.OB", "Indirectos de Obra", True, [
                    ("EGR.CI.013", "Supervisión de obra", False, []),
                    ("EGR.CI.014", "Servicios de obra", False, []),
                    ("EGR.CI.015", "Costos de campamento", False, []),
                    ("EGR.CI.016", "Alumbrado público", False, []),
                    ("EGR.CI.017", "Papelería", False, []),
                    ("EGR.CI.018", "Oficina", False, []),
                    ("EGR.CI.019", "Nómina", False, []),
                    ("EGR.CI.020", "Servicios", False, []),
                    ("EGR.CI.021", "Equipo de seguridad", False, []),
                    ("EGR.CI.022", "Vigilancia", False, []),
                    ("EGR.CI.023", "Almacén", False, []),
                    ("EGR.CI.024", "Laboratorio / terracerías y/o concreto", False, []),
                    ("EGR.CI.025", "Topografía", False, []),
                    ("EGR.CI.026", "Postventa", False, []),
                    ("EGR.CI.027", "Mecánica de suelos", False, []),
                    ("EGR.CI.028", "Proyectos ejecutivos", False, []),
                    ("EGR.CI.029", "DRO", False, []),
                    ("EGR.CI.030", "Consultorías", False, []),
                    ("EGR.CI.031", "Imprevistos", False, []),
                ]),
            ]),
            ("EGR.CD", "Costos Directos", True, [
                ("EGR.CD.001", "Movimiento de tierras", False, []),
                ("EGR.CD.002", "Urbanización", False, []),
                ("EGR.CD.003", "Infraestructura", False, []),
                ("EGR.CD.004", "Ingenierías", False, []),
                ("EGR.CD.005", "Edificación", False, []),
                ("EGR.CD.006", "Insumos", False, []),
                ("EGR.CD.007", "Nómina semanal", False, []),
            ]),
        ],
    ),
    (
        "GAS",
        "GASTOS",
        True,
        [
            ("GAS.VC", "Gastos de Venta / Comercialización", True, [
                ("GAS.VC.001", "Escrituración", False, []),
                ("GAS.VC.002", "Comisiones de venta", False, []),
                ("GAS.VC.003", "Comisiones de titulación", False, []),
                ("GAS.VC.004", "Publicidad", False, []),
                ("GAS.VC.005", "Eventos", False, []),
            ]),
            ("GAS.LG", "Gastos Legales", True, [
                ("GAS.LG.001", "Trámites", False, []),
                ("GAS.LG.002", "Juicios", False, []),
                ("GAS.LG.003", "Corporativo", False, []),
            ]),
            ("GAS.CO", "Contingencias", True, [
                ("GAS.CO.001", "Multas", False, []),
                ("GAS.CO.003", "Allanamientos, robos y vandalismo", False, []),
            ]),
            ("GAS.OM", "Gubernamental — Municipal / Estatal / Federal", True, [
                ("GAS.OM.001", "Municipal", False, []),
                ("GAS.OM.002", "Estatal", False, []),
                ("GAS.OM.003", "Federal", False, []),
            ]),
            ("GAS.OG", "Gastos Generales", True, [
                ("GAS.OG.001", "Viáticos", False, []),
                ("GAS.OG.002", "Impuestos Generales", False, []),
                ("GAS.OG.003", "Seguros y fianzas", False, []),
                ("GAS.OG.004", "Licencias y programas", False, []),
                ("GAS.OG.005", "Otros", False, []),
            ]),
        ],
    ),
    (
        "ACT",
        "ACTIVOS",
        True,
        [
            ("ACT.DP", "Activos Depreciables", True, [
                ("ACT.DP.001", "Maquinaria", False, []),
                ("ACT.DP.002", "Equipo de transporte", False, []),
                ("ACT.DP.003", "Equipos de cómputo", False, []),
                ("ACT.DP.004", "Equipo menor", False, []),
            ]),
        ],
    ),
]


def flatten() -> list[dict]:
    """Flatten CATALOG into ordered rows with parent codes and sort orders."""
    rows: list[dict] = []
    counter = {"n": 0}

    def walk(node: tuple, section: str, parent_code: str | None) -> None:
        code, name, is_header, children = node
        counter["n"] += 1
        rows.append(
            {
                "code": code,
                "name": name,
                "is_header": is_header,
                "section": section,
                "parent_code": parent_code,
                "sort_order": counter["n"],
            }
        )
        for child in children:
            walk(child, section, code)

    for top in CATALOG:
        walk(top, section=top[0], parent_code=None)
    return rows
