"""Reference-inspired carved writing table, books and open scroll cabinet.

Local editable Blender geometry; no paid generation or raster texture required.
X is the table's long axis, negative Y is its open/front side, Z is up.
"""
import bpy
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/tang-study-writing-table.glb'
LENGTH, DEPTH, TABLE_TOP = 2.32, .60, .77
# Preserve the previous cabinet proportions, then reduce the current assembly to 75%.
CABINET_SCALE = .75 * .75
BOOK_STACK_SCALE = .75
BOOK_STACK_BASE = TABLE_TOP + .007
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root = bpy.data.objects.new('study_writing_table_furniture', None)
bpy.context.collection.objects.link(root)
root['furnitureRole'] = 'carved-writing-table-with-books-and-scroll-cabinet'
root['provenance'] = 'Local Blender construction from the user reference'
PIGMENTS = {
    'wood': '92775c', 'moulding': 'a38a69', 'recess': '75634e',
    'carving': 'b09b76', 'paper': 'e2d4ae', 'paper_edge': 'c6b68e',
    'book_red': 'aa7663', 'book_jade': '768b78', 'book_ochre': 'ae9c75',
    'label': 'ddd0a7', 'binding': '8e8065', 'brass': 'b5a06e',
}


def linear(value):
    rgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]


materials = {}
for name, color in PIGMENTS.items():
    mat = bpy.data.materials.new('writing_table_' + name)
    mat.diffuse_color = (*linear(color), 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    rgb = nodes.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = mat.diffuse_color
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(rgb.outputs[0], output.inputs['Surface'])
    materials[name] = mat


def finish(obj, name, pigment, quiet=False):
    obj.name = name
    obj.data.materials.append(materials[pigment])
    obj.parent = root
    obj['skipInk'] = quiet
    obj['inkThreshold'] = 42
    return obj


def box(name, location, size, pigment='wood', bevel=.004, quiet=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, pigment, quiet)
    if bevel:
        modifier = obj.modifiers.new('Soft timber edge', 'BEVEL')
        modifier.width, modifier.segments = bevel, 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def line(name, points, radius=.002, pigment='carving', quiet=True):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth, curve.bevel_resolution = radius, 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, pigment, quiet)


def cylinder(name, location, radius, depth, pigment='paper', axis='Y', quiet=True, vertices=32):
    rotation = (math.pi / 2, 0, 0) if axis == 'Y' else (0, math.pi / 2, 0) if axis == 'X' else (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                      location=location, rotation=rotation)
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, pigment, quiet)


def extrude_profile(name, outline, origin, axis, normal, depth, pigment='wood'):
    origin, axis, normal = Vector(origin), Vector(axis), Vector(normal)
    up = Vector((0, 0, 1))
    vertices = [tuple(origin + axis * u + up * z + normal * side * depth / 2)
                for side in [-1, 1] for u, z in outline]
    n = len(outline)
    faces = [list(range(n - 1, -1, -1)), list(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, name, pigment)
    bevel = obj.modifiers.new('Hand-finished profile', 'BEVEL')
    bevel.width, bevel.segments = .004, 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


# Recessed curved legs and framed pierced ends, with genuinely open spaces.
leg_profile = [(-.038, .715), (.038, .715), (.036, .18), (.041, .08),
               (.057, .038), (.057, 0), (-.051, 0), (-.051, .04),
               (-.032, .085), (-.025, .19)]
for sx in [-1, 1]:
    x = sx * (LENGTH / 2 - .12)
    for sy in [-1, 1]:
        extrude_profile(f'curved_leg_{sx}_{sy}', leg_profile,
                        (x, sy * .226, 0), (0, sy, 0), (1, 0, 0), .066)
    for z in [.20, .662]:
        box(f'end_panel_rail_{sx}_{z}', (x, 0, z), (.066, .46, .035))
    box(f'end_panel_lower_moulding_{sx}', (x + sx * .035, 0, .218),
        (.009, .388, .012), 'moulding', .002, True)
    # Circular seal-like medallion and four connected curling tendrils.
    front_x = x + sx * .006
    def point(u, v):
        return (front_x, u, .434 + v)
    circle = [point(.087 * math.cos(i * math.tau / 48), .087 * math.sin(i * math.tau / 48))
              for i in range(49)]
    line(f'longevity_medallion_{sx}', circle, .007, 'carving')
    seal_paths = [
        [(-.045, .047), (.045, .047)], [(-.055, .017), (.055, .017)],
        [(-.047, -.013), (.047, -.013)], [(0, .061), (0, -.013)],
        [(-.05, -.039), (.047, -.039), (.047, -.06), (.024, -.06)],
        [(-.02, -.026), (-.02, -.061)],
    ]
    for i, path in enumerate(seal_paths):
        line(f'seal_bar_{sx}_{i}', [point(u, v) for u, v in path], .0052, 'carving')
    for su in [-1, 1]:
        for sv in [-1, 1]:
            # The carved ribbons join the inner ring to the structural rails.
            pts = [point(su * (.075 + .067 * t), sv * (.062 + .135 * t))
                   for t in [i / 12 for i in range(13)]]
            line(f'carving_stem_{sx}_{su}_{sv}', pts, .0055)
            curl = []
            for i in range(42):
                t = i / 41
                angle = -.7 + t * math.pi * 2.0
                radius = .044 * (1 - .70 * t)
                curl.append(point(su * (.125 + radius * math.cos(angle)),
                                  sv * (.121 + radius * math.sin(angle))))
            line(f'cloud_scroll_{sx}_{su}_{sv}', curl, .006)
            leaf = [point(su * (.107 + .058 * math.sin(math.pi * t)),
                          sv * (.169 + .030 * math.sin(math.tau * t)))
                    for t in [i / 30 for i in range(31)]]
            line(f'carved_leaf_{sx}_{su}_{sv}', leaf, .0045)
    # A narrow upright at each edge ties openwork to both rails.
    for sy in [-1, 1]:
        line(f'inner_end_frame_{sx}_{sy}', [(front_x, sy * .193, .23),
             (front_x, sy * .193, .641)], .006, 'wood')

for sy in [-1, 1]:
    box(f'long_under_apron_{sy}', (0, sy * .245, .685), (LENGTH - .18, .035, .065))
    box(f'long_edge_moulding_{sy}', (0, sy * .278, .724),
        (LENGTH - .025, .018, .016), 'moulding', .003)
    for sx in [-1, 1]:
        extrude_profile(f'corner_spandrel_{sx}_{sy}',
                        [(0, .704), (.14, .704), (.13, .689), (.07, .675), (0, .60)],
                        (sx * (LENGTH / 2 - .12), sy * .245, 0), (-sx, 0, 0),
                        (0, 1, 0), .027)
box('tabletop', (0, 0, TABLE_TOP - .025), (LENGTH, DEPTH, .05), 'wood', .009)
box('tabletop_inset', (0, 0, TABLE_TOP + .001), (LENGTH - .09, DEPTH - .07, .006),
    'moulding', .005, True)
for y in [-.19, .06, .20]:
    line(f'quiet_wood_grain_{y}', [(-1.08, y, .775), (-.45, y + .007, .775),
         (.16, y - .004, .775), (1.08, y + .003, .775)], .00075, 'wood')


def book_stack(name, x, y, width, depth, count, cover, offset=0):
    before_stack = set(root.children)
    for i in range(count):
        z = .779 + i * .031
        drift = math.sin(i * 2 + offset) * .005
        box(f'{name}_{i}_pages', (x + drift, y, z + .015),
            (width - .009, depth - .014, .023), 'paper', .002, True)
        for side in [0, .029]:
            box(f'{name}_{i}_cover_{side}', (x + drift, y, z + side),
                (width, depth, .004), cover, .002, True)
        line(f'{name}_{i}_page_edge', [(x - width / 2 + .015 + drift, y - depth / 2 - .001, z + .014),
             (x + width / 2 - .015 + drift, y - depth / 2 - .001, z + .014)], .00065, 'paper_edge')
        for stitch in [-.12, -.04, .04, .12]:
            if abs(stitch) > depth / 2 - .01:
                continue
            line(f'{name}_{i}_binding_{stitch}',
                 [(x - width / 2 + .013 + drift, y + stitch, z + .027),
                  (x - width / 2 + .007 + drift, y + stitch, z + .016),
                  (x - width / 2 + .012 + drift, y + stitch, z + .004)], .0011, 'binding')
    z = .779 + (count - 1) * .031 + .032
    box(name + '_title_slip', (x + width * .15, y, z),
        (.052, depth * .66, .0015), 'label', .001, True)
    # Resize each complete stack about its tabletop footprint, including pages,
    # covers, bindings and title slip, while retaining its placement and base.
    anchor = Vector((x, y, BOOK_STACK_BASE))
    for obj in set(root.children) - before_stack:
        obj.location = anchor + (obj.location - anchor) * BOOK_STACK_SCALE
        obj.scale *= BOOK_STACK_SCALE


book_stack('vermilion_folios', -.884, .006, .34, .407, 6, 'book_red')
book_stack('jade_folios', -.493, .026, .35, .407, 6, 'book_jade', 1)

# An open wooden book/scroll box with twelve individually rolled manuscripts.
before_cabinet = set(root.children)
cx, cy, cw, cd, base, height = .64, .071, .72, .36, .797, .458
box('scroll_box_base', (cx, cy, base + .013), (cw, cd, .026), 'wood', .005)
box('scroll_box_top', (cx, cy, base + height - .014), (cw + .026, cd + .02, .028), 'wood', .005)
box('scroll_box_back', (cx, cy + cd / 2 - .012, base + height / 2),
    (cw, .024, height - .035), 'recess', .003)
for side in [-1, 1]:
    x = cx + side * (cw / 2 - .014)
    box(f'scroll_box_side_{side}', (x, cy, base + height / 2),
        (.028, cd, height - .024), 'wood', .003)
    # Each door is folded 145 degrees open: the aisle remains clear.
    hinge = Vector((cx + side * (cw / 2 - .012), cy - cd / 2 - .005, base + height / 2))
    angle = side * math.radians(145)
    direction = Vector((-side * math.cos(angle), -side * math.sin(angle), 0))
    center = hinge + direction * (cw / 4 - .007)
    door = box(f'open_cabinet_door_{side}', center,
               (cw / 2 - .014, .019, height - .026), 'wood', .003)
    door.rotation_euler.z = angle
    # Slim raised frame and field rotate together with the door.
    normal = Vector((-math.sin(angle), math.cos(angle), 0))
    inset = box(f'door_inset_{side}', center - normal * .0105,
                (cw / 2 - .057, .004, height - .083), 'moulding', .002, True)
    inset.rotation_euler.z = angle
    for hz in [-.14, .14]:
        cylinder(f'brass_hinge_{side}_{hz}', (hinge.x, hinge.y, hinge.z + hz),
                 .008, .034, 'brass', 'Z', True, 12)

front_y = cy - cd / 2 - .001
for row, count in enumerate([5, 4, 3]):
    for i in range(count):
        x = cx + (i - (count - 1) / 2) * .130
        z = .874 + row * .126
        name = f'rolled_manuscript_{row}_{i}'
        cylinder(name, (x, front_y + .145, z), .064, .285, 'paper', 'Y', True)
        cylinder(name + '_rim', (x, front_y - .0015, z), .061, .003, 'label', 'Y', True)
        # A faint end spiral describes paper thickness rather than shading.
        spiral = []
        for step in range(64):
            t = step / 63
            r = .012 + .040 * t
            angle = t * math.tau * 1.5
            spiral.append((x + r * math.cos(angle), front_y - .0035, z + r * math.sin(angle)))
        line(name + '_paper_spiral', spiral, .00065, 'paper_edge')
        cylinder(name + '_tie_knob', (x, front_y - .008, z), .007, .014, 'binding', 'Y', True, 12)
        line(name + '_tag_cord', [(x, front_y - .016, z), (x, front_y - .021, z - .023)], .0012, 'binding')
        box(name + '_hanging_title_tag', (x, front_y - .023, z - .045),
            (.014, .003, .042), 'label', .001, True)
        line(name + '_tag_mark', [(x, front_y - .025, z - .036),
             (x, front_y - .025, z - .048)], .0006, 'binding')

# Resize the complete cabinet assembly, including doors, rolls and tags.
# Its base remains in contact with the tabletop; the table stays unchanged.
cabinet_anchor = Vector((cx, cy, base))
tabletop_anchor = Vector((cx, cy, TABLE_TOP + .004))
for obj in set(root.children) - before_cabinet:
    obj.location = tabletop_anchor + (obj.location - cabinet_anchor) * CABINET_SCALE
    obj.scale *= CABINET_SCALE

# Batch only like pigments and ink behavior; retain the authored .blend source.
for obj in list(root.children):
    if obj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')
for pigment, material in materials.items():
    for quiet in [False, True]:
        objects = [o for o in root.children if o.type == 'MESH' and o.data.materials
                   and o.data.materials[0] == material and bool(o.get('skipInk')) == quiet]
        if not objects:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        result = bpy.context.object
        result.name = f'study_writing_table__{pigment}' + ('_fine' if quiet else '')
        result['skipInk'], result['inkThreshold'] = quiet, 42

bpy.context.view_layer.update()
vertices = [o.matrix_world @ v.co for o in root.children if o.type == 'MESH' for v in o.data.vertices]
lo = [min(v[i] for v in vertices) for i in range(3)]
hi = [max(v[i] for v in vertices) for i in range(3)]
assert abs(lo[2]) < .001
assert hi[0] - lo[0] < 2.45 and hi[1] - lo[1] < .625
assert abs(hi[2] - (TABLE_TOP + .004 + height * CABINET_SCALE)) < .002
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art-source/study-writing-table.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_yup=True,
                         export_extras=True, export_cameras=False, export_lights=False)
data = OUT.read_bytes()
json_length = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20 + json_length])
for material in doc['materials']:
    pigment = material['name'].replace('writing_table_', '')
    material['pbrMetallicRoughness'] = {'baseColorFactor': [*linear(PIGMENTS[pigment]), 1],
                                      'metallicFactor': 0, 'roughnessFactor': 1}
    material.pop('emissiveFactor', None)
    material.setdefault('extensions', {})['KHR_materials_unlit'] = {}
if 'KHR_materials_unlit' not in doc.setdefault('extensionsUsed', []):
    doc['extensionsUsed'].append('KHR_materials_unlit')
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
tail = data[20 + json_length:]
OUT.write_bytes(struct.pack('<III', 0x46546c67, 2, 20 + len(encoded) + len(tail))
                + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + tail)
report = {
    'method': 'Local Blender construction from user references', 'lux3dTaskSubmitted': False,
    'boundsBlender': [lo, hi], 'dimensionsXYZBlender': [hi[i] - lo[i] for i in range(3)],
    'tabletopHeight': TABLE_TOP, 'meshes': len(doc['meshes']), 'materials': len(doc['materials']),
    'cabinetScale': CABINET_SCALE, 'cabinetScaleRelativeToPrevious': .75, 'cabinetBaseHeight': TABLE_TOP + .004,
    'bookStackScale': BOOK_STACK_SCALE, 'bookStackBaseHeight': BOOK_STACK_BASE,
    'triangles': sum(p['indices'] is not None and doc['accessors'][p['indices']]['count'] // 3
                     for mesh in doc['meshes'] for p in mesh['primitives']),
    'bytes': OUT.stat().st_size, 'output': str(OUT),
    'references': ['art-source/writing-table-reference.jpg', 'art-source/writing-table-layout-reference.png'],
    'features': ['pierced cloud-scroll end panels', 'curved feet', 'two book stacks / twelve volumes at 75% scale',
                 'open twin-door scroll box', 'twelve rolled manuscripts with hanging tags', 'flat outlined pigments'],
}
(ROOT / 'art-source/study-writing-table-provenance.json').write_text(json.dumps(report, indent=2) + '\n')
print('WRITING_TABLE_BUILD ' + json.dumps(report))
