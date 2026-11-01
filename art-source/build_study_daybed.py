"""Reference-inspired three-sided low daybed; local Blender construction.

Lux3D's CN quote endpoint returned NETWORK_UNAVAILABLE. No generation task was
submitted. This editable model is built locally, without cloud task records.
Blender coordinates: X=length, Y=depth (negative Y is the open front), Z=up.
"""
import bpy
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/tang-study-daybed.glb'
LENGTH, DEPTH, SEAT, HEIGHT = 2.62, 1.22, .44, .88
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root = bpy.data.objects.new('study_daybed_furniture', None)
bpy.context.collection.objects.link(root)
root['furnitureRole'] = 'three-sided-low-daybed'
root['provenance'] = 'Local Blender model based on user reference, not a Lux3D generated asset'
root['dimensionsMetres'] = [LENGTH, DEPTH, HEIGHT]

PIGMENTS = {
    'frame': '737a69', 'moulding': '92977f', 'groove': '636a5b',
    'paper': 'e4dfc9', 'mat': 'd9cda9', 'weave': 'c6bc9c',
    'mountain_far': 'c9cdb9', 'mountain_mid': 'b6c0ab',
    'mountain_near': 'a0af9a', 'landscape_line': '929f8c',
}


def linear(value):
    rgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]


materials = {}
for name, color in PIGMENTS.items():
    material = bpy.data.materials.new('daybed_' + name)
    material.diffuse_color = (*linear(color), 1)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    rgb = nodes.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = material.diffuse_color
    output = nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(rgb.outputs[0], output.inputs['Surface'])
    materials[name] = material


def finish(obj, name, pigment, quiet=False):
    obj.name = name
    obj.data.materials.append(materials[pigment])
    obj.parent = root
    if quiet:
        obj['skipInk'] = True
    else:
        obj['inkThreshold'] = 42
    return obj


def box(name, location, size, pigment='frame', bevel=.006, quiet=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, pigment, quiet)
    if bevel:
        modifier = obj.modifiers.new('Rounded timber edges', 'BEVEL')
        modifier.width, modifier.segments = bevel, 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def polygon(name, vertices, pigment, quiet=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [list(range(len(vertices)))])
    mesh.update()
    return finish(bpy.data.objects.new(name, mesh), name, pigment, quiet)


def draw_polygon(name, vertices, pigment):
    obj = polygon(name, vertices, pigment)
    bpy.context.collection.objects.link(obj)
    return obj


def line(name, points, radius=.001, pigment='weave'):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth, curve.bevel_resolution = radius, 0
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, pigment, True)


def extrude_profile(name, outline, origin, axis, normal, depth, pigment='frame'):
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
    bevel.width, bevel.segments = .005, 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


# Four slightly curved horsehoof feet rather than block legs.
foot_outline = [(-.065, .35), (.065, .35), (.062, .19), (.09, .09),
                (.105, .055), (.103, .022), (.07, 0), (-.035, 0),
                (-.068, .025), (-.069, .065), (-.035, .125), (-.035, .26)]
for sx in [-1, 1]:
    for sy in [-1, 1]:
        extrude_profile(f'curved_foot_{sx}_{sy}', foot_outline,
                        (sx * (LENGTH / 2 - .13), sy * (DEPTH / 2 - .13), 0),
                        (sx, 0, 0), (0, 1, 0), .125)

# A stepped platform, with a shallow shaped apron under each long edge.
apron_half = LENGTH / 2 - .13
apron_outline = [(-apron_half, .385), (apron_half, .385), (apron_half, .215),
                 (apron_half - .09, .215), (apron_half - .15, .26),
                 (apron_half - .26, .282), (.45, .282), (.24, .265),
                 (-.24, .265), (-.45, .282), (-apron_half + .26, .282),
                 (-apron_half + .15, .26), (-apron_half + .09, .215), (-apron_half, .215)]
for sy in [-1, 1]:
    extrude_profile(f'shaped_long_apron_{sy}', apron_outline,
                    (0, sy * (DEPTH / 2 - .075), 0), (1, 0, 0), (0, 1, 0), .065)
    box(f'long_apron_moulding_{sy}', (0, sy * (DEPTH / 2 - .037), .36),
        (LENGTH - .16, .018, .025), 'moulding', .004)
for sx in [-1, 1]:
    box(f'end_apron_{sx}', (sx * (LENGTH / 2 - .075), 0, .31),
        (.065, DEPTH - .22, .145))
box('platform_lower_step', (0, 0, .376), (LENGTH - .055, DEPTH - .055, .075))
box('platform_upper_lip', (0, 0, .419), (LENGTH, DEPTH, .045), 'moulding', .012)
box('seat_border_frame', (0, 0, .433), (LENGTH - .035, DEPTH - .035, .027), 'frame', .009)
box('woven_mat', (0, -.008, SEAT + .008), (LENGTH - .18, DEPTH - .17, .018), 'mat', .014, True)

# Sparse low-contrast weave and a narrow lozenge border keep the seat quiet.
for i in range(27):
    y = -.47 + i * .036
    line(f'mat_weave_{i}', [(-1.16, y, .458), (1.16, y, .458)], .00065)
for i in range(11):
    x = -1.12 + i * .224
    line(f'mat_cross_weave_{i}', [(x, -.47, .459), (x, .47, .459)], .0005)
for sy in [-1, 1]:
    line(f'mat_border_{sy}', [(-1.17, sy * .49, .459), (1.17, sy * .49, .459)], .0012)
    for i in range(13):
        x, y = -1.08 + i * .18, sy * .485
        line(f'mat_lozenge_{sy}_{i}', [(x - .025, y, .46), (x, y - .012, .46),
             (x + .025, y, .46), (x, y + .012, .46), (x - .025, y, .46)], .00065)

# Three enclosing rails: the south/front edge is intentionally completely open.
rail_bottom, rail_top = .46, HEIGHT
rail_center = (rail_bottom + rail_top) / 2
rail_height = rail_top - rail_bottom
back_y = DEPTH / 2 - .04
box('back_rail', (0, back_y, rail_center), (LENGTH - .035, .07, rail_height), 'frame', .018)
for sx in [-1, 1]:
    x = sx * (LENGTH / 2 - .035)
    box(f'end_rail_{sx}', (x, 0, rail_center), (.07, DEPTH - .035, rail_height), 'frame', .018)
    for sy in [-1, 1]:
        box(f'rail_corner_{sx}_{sy}', (x, sy * (DEPTH / 2 - .045), .668),
            (.087, .085, .425), 'frame', .025)


def landscape(name, center, horizontal, normal, width, height, phase=0):
    center, horizontal, normal = Vector(center), Vector(horizontal), Vector(normal)
    up = Vector((0, 0, 1))
    def p(u, v, offset=0):
        return tuple(center + horizontal * u + up * v + normal * offset)
    hw, hh = width / 2, height / 2
    draw_polygon(name + '_ivory_inset', [p(-hw, -hh), p(hw, -hh), p(hw, hh), p(-hw, hh)], 'paper')
    # Small flat landscape inlays echo the reference, without a busy texture.
    for layer, pigment in enumerate(['mountain_far', 'mountain_mid', 'mountain_near']):
        ridge = []
        for i in range(23):
            u = -hw + width * i / 22
            peak = (.5 + .24 * math.sin(i * 1.73 + phase + layer)
                    + .18 * math.sin(i * .78 + phase * .6))
            v = -hh + height * ((.25 - layer * .045) + peak * (.53 - layer * .08))
            ridge.append(p(u, v, .0015 + layer * .001))
        draw_polygon(name + '_ridge_' + str(layer),
                     [p(-hw, -hh, .0015 + layer * .001)] + ridge + [p(hw, -hh, .0015 + layer * .001)], pigment)
        if layer == 2:
            line(name + '_ridge_contour', ridge, .00075, 'landscape_line')
    # Inset edges are restrained flat timber mouldings, not black borders.
    for v in [-hh - .007, hh + .007]:
        line(name + '_moulding_h_' + str(v), [p(-hw - .012, v, .006), p(hw + .012, v, .006)], .004, 'moulding')
    for u in [-hw - .007, hw + .007]:
        line(name + '_moulding_v_' + str(u), [p(u, -hh, .006), p(u, hh, .006)], .0035, 'moulding')


landscape('back_landscape', (0, back_y - .0355, .672), (1, 0, 0), (0, -1, 0), LENGTH - .255, .265)
for sx in [-1, 1]:
    for facing in [-1, 1]:
        x = sx * (LENGTH / 2 - .035) + facing * .0355
        landscape(f'end_landscape_{sx}_{facing}', (x, 0, .672), (0, 1, 0), (facing, 0, 0),
                  DEPTH - .255, .265, sx * .7)

# Convert decorative curves and batch by pigment/ink treatment for efficient use.
for obj in list(root.children):
    if obj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')
for pigment, material in materials.items():
    for quiet in [False, True]:
        objects = [obj for obj in root.children if obj.type == 'MESH'
                   and obj.data.materials and obj.data.materials[0] == material
                   and bool(obj.get('skipInk', False)) == quiet]
        if not objects:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        result = bpy.context.object
        result.name = f'study_daybed_furniture__{pigment}' + ('_fine' if quiet else '')
        result['skipInk'] = quiet
        result['inkThreshold'] = 42

bpy.context.view_layer.update()
vertices = [obj.matrix_world @ v.co for obj in root.children if obj.type == 'MESH' for v in obj.data.vertices]
lo = [min(v[i] for v in vertices) for i in range(3)]
hi = [max(v[i] for v in vertices) for i in range(3)]
assert abs(lo[2]) < .002
assert hi[0] - lo[0] < 2.67 and hi[1] - lo[1] < 1.25
assert .87 < hi[2] < .90
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art-source/study-daybed.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_yup=True,
                         export_extras=True, export_cameras=False, export_lights=False)

# Normalize the limited flat palette in the exported asset explicitly.
data = OUT.read_bytes()
json_length = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20 + json_length])
for material in doc['materials']:
    pigment = material['name'].replace('daybed_', '')
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
report = {'method': 'Local Blender modeling from the user reference', 'lux3dTaskSubmitted': False,
          'lux3dQuoteResult': 'NETWORK_UNAVAILABLE', 'dimensionsXYZBlender': [hi[i] - lo[i] for i in range(3)],
          'boundsBlender': [lo, hi], 'meshes': len([o for o in root.children if o.type == 'MESH']),
          'triangles': sum(len(o.data.loop_triangles) for o in root.children if o.type == 'MESH'),
          'materials': list(PIGMENTS), 'output': str(OUT), 'bytes': OUT.stat().st_size,
          'reference': 'art-source/daybed-reference.png',
          'features': ['three low rails', 'open front', 'curved horsehoof feet', 'shaped apron',
                       'pale woven mat', 'quiet flat landscape inlays', 'unlit celadon timber palette']}
(ROOT / 'art-source/study-daybed-provenance.json').write_text(json.dumps(report, indent=2))
print('DAYBED_BUILD ' + json.dumps(report))
