"""Sculpt editable, connected cloud banks from the supplied painted-cloud reference.

Run in Blender background mode. This is local modeling, not a Lux3D result.
The final surface is voxel-unioned, softened, and painted with vertex pigments;
the component ellipsoids are construction tools, not overlapping runtime balls.
"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector, noise
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/tang-sky-clouds.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def linear(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return Vector([v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb])


def smoothstep(a, b, v):
    t = max(0, min(1, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


paper, mid, shade, deep = map(linear, ['eee7d8', 'dce0da', 'b5c3ce', '9cabbc'])
paint = bpy.data.materials.new('cloud_warm_paper_and_blue_wash')
paint.use_nodes = True
nt = paint.node_tree
nt.nodes.clear()
colors = nt.nodes.new('ShaderNodeVertexColor')
colors.layer_name = 'CloudPigment'
output = nt.nodes.new('ShaderNodeOutputMaterial')
# A direct color-to-surface connection exports as KHR_materials_unlit in Blender 5.2.
nt.links.new(colors.outputs['Color'], output.inputs['Surface'])

ink = bpy.data.materials.new('cloud_muted_blue_crease_ink')
ink.diffuse_color = (*linear('98a8b5'), 1)
ink.use_nodes = True
nt = ink.node_tree
nt.nodes.clear()
rgb = nt.nodes.new('ShaderNodeRGB')
rgb.outputs[0].default_value = ink.diffuse_color
output = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(rgb.outputs[0], output.inputs['Surface'])


def ellipsoid(center, radius, seed):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=18, location=center)
    obj = bpy.context.object
    for v in obj.data.vertices:
        # Small irregularities soften the perfect mathematical scallops.
        n = noise.noise_vector(v.co * 3.6 + Vector((seed, .7, 1.3)))
        v.co += n * .042
    obj.scale = radius
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def make_cloud(index):
    rng = random.Random(214 + index * 31)
    root = bpy.data.objects.new(f'sky_cloud_bank_{index + 1}', None)
    bpy.context.collection.objects.link(root)
    root['provenance'] = 'Locally sculpted in Blender from the user cloud reference; not Lux3D generation'
    root['assetRole'] = 'painted-sky-cloud'
    parts = []
    lobes = []
    # Asymmetric high peaks and smaller shoulders, all sharing a long soft base.
    peaks = [[.65, .92, 1.24, .86, 1.05, .81, 1.52, 1.09, .68],
             [.64, 1.34, 1.02, .82, 1.13, 1.52, 1.08, .83, .61],
             [.56, .83, 1.14, 1.56, 1.13, .78, 1.04, .79, .58]][index]
    parts.append(ellipsoid((0, .15, .34), (4.65, .72, .39), index))
    for i, r in enumerate(peaks):
        x = -4.5 + i * 1.12 + rng.uniform(-.12, .12)
        z = .32 + r * .64
        y = rng.uniform(-.48, .50)
        lobes.append((x, y, z, r))
        parts.append(ellipsoid((x, y, z), (r * 1.04, r * .79, r), i + index * 13))
        # A small foreground billow breaks the uniform string of large domes.
        q = rng.uniform(.38, .66)
        parts.append(ellipsoid((x + rng.uniform(-.30, .35), -.73, .32 + q * .54),
                               (q * 1.24, q * .80, q * .78), 50 + i))
        q = rng.uniform(.22, .38)
        parts.append(ellipsoid((x + .40, -.82, .27), (q * 1.3, q * .8, q), 90 + i))
        if 1 < i < 8:
            q = rng.uniform(.31, .49)
            parts.append(ellipsoid((x - r * .48, y - .12, z + r * .82),
                                   (q * 1.06, q * .82, q), 70 + i))
            q = rng.uniform(.22, .33)
            parts.append(ellipsoid((x + r * .56, y + .04, z + r * .73),
                                   (q * 1.12, q * .85, q), 110 + i))

    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = root.name + '__painted_surface'
    # Bake the modeling transforms before unifying and painting.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    remesh = obj.modifiers.new('Continuous sculpted cloud volume', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = .072
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    soften = obj.modifiers.new('Soft billowing transitions', 'SMOOTH')
    soften.factor = .70
    soften.iterations = 7
    bpy.ops.object.modifier_apply(modifier=soften.name)
    for vertex in obj.data.vertices:
        p = vertex.co
        # Broad fluffy underside, without a flat cut or a hard elliptical rim.
        if p.z < .23:
            p.z = .23 + (p.z - .23) * .65
        p += noise.noise_vector(p * 2.4 + Vector((index * 4.3, .2, .8))) * .022
    decimate = obj.modifiers.new('Game mesh', 'DECIMATE')
    decimate.ratio = min(1, 26000 / max(1, len(obj.data.polygons)))
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.update()
    bpy.context.view_layer.update()

    # A soft multiray light wash adds blue undercuts between joined cloud lobes.
    tree = BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())
    sun = Vector((-.32, -.49, .86)).normalized()
    lights = [(sun + Vector((x, y, .04))).normalized()
              for x, y in [(-.18, -.12), (.18, -.12), (-.18, .12), (.18, .12)]]
    attr = obj.data.color_attributes.new(name='CloudPigment', type='FLOAT_COLOR', domain='POINT')
    for vertex, color in zip(obj.data.vertices, attr.data):
        p, normal = vertex.co, vertex.normal.normalized()
        visibility = 0
        for light in lights:
            hit, _, _, _ = tree.ray_cast(p + normal * .035, light, 2.2)
            visibility += .25 if hit is None else 0
        illumination = max(0, normal.dot(sun))
        lightness = smoothstep(-.20, .88, illumination - (1 - visibility) * .48)
        # Broken, softly blended paint patches suggest the reference's watercolor.
        wash = noise.noise(p * 2.5 + Vector((index * 3, .6, .2))) * .21
        wash += noise.noise(p * 9.0) * .04
        amount = max(0, min(1, lightness + wash))
        pigment = shade.lerp(paper, amount)
        broken_wash = smoothstep(-.22, .30, noise.noise(p * 4.3 + Vector((.5, index, .2))))
        pigment = pigment.lerp(shade, broken_wash * .17 * (1 - illumination * .45))
        underside = (1 - smoothstep(.12, .70, p.z)) * .24
        pigment = pigment.lerp(deep, underside)
        pigment = pigment.lerp(mid, (1 - visibility) * .12)
        color.color = (*pigment, 1)
    obj.data.materials.append(paint)
    obj.parent = root
    obj['skipInk'] = True

    # Sparse surface-following contour fragments, instead of triangular wireframes.
    strokes = []
    for i in [1, 3, 5, 6, 7]:
        x, y, z, r = lobes[i]
        points = []
        for j in range(24):
            a = math.pi * (.93 + j / 23 * .61)
            xx = x + math.cos(a) * r * .72
            zz = z + math.sin(a) * r * .63
            hit, normal, _, _ = tree.ray_cast(Vector((xx, -6, zz)), Vector((0, 1, 0)), 12)
            if hit is not None:
                points.append(hit + normal * .009)
        if len(points) < 8:
            continue
        curve = bpy.data.curves.new('soft lobe contour', 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth = .007
        curve.bevel_resolution = 1
        spline = curve.splines.new('POLY')
        spline.points.add(len(points) - 1)
        for j, (point, coord) in enumerate(zip(spline.points, points)):
            point.co = (*coord, 1)
            point.radius = .30 + .70 * math.sin(math.pi * j / (len(points) - 1)) ** .5
        stroke = bpy.data.objects.new('cloud crease', curve)
        bpy.context.collection.objects.link(stroke)
        stroke.data.materials.append(ink)
        strokes.append(stroke)
    if strokes:
        bpy.ops.object.select_all(action='DESELECT')
        for stroke in strokes:
            stroke.select_set(True)
        bpy.context.view_layer.objects.active = strokes[0]
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.join()
        stroke = bpy.context.object
        stroke.name = root.name + '__painted_crease_ink'
        stroke.parent = root
        stroke['skipInk'] = True
    return root


roots = [make_cloud(i) for i in range(3)]
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art-source/sky-clouds.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_extras=True, export_yup=True,
                        export_vertex_color='NAME', export_vertex_color_name='CloudPigment', export_all_vertex_colors=False)
record = {'method': 'local Blender modeling', 'reference': 'user-supplied painted cumulus image',
          'cloudBanks': [root.name for root in roots], 'output': str(OUT),
          'meshVertices': sum(len(obj.data.vertices) for obj in bpy.data.objects if obj.type == 'MESH'),
          'note': 'Lux3D OpenAPI pricing could not connect; no generation task was submitted.'}
(ROOT / 'art-source/sky-clouds-provenance.json').write_text(json.dumps(record, indent=2))
print('SKY_CLOUDS_READY', json.dumps(record))
