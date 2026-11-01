"""Sculpt broad, horizontal cloud volumes with a billowing underside for ground views.

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
OUT = ROOT / 'public/models/tang-volume-clouds.glb'
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
    # Broad horizontal footprint: overlapping lower billows, with no flat base plate.
    for row, y0 in enumerate([-1.45, 0, 1.45]):
        for col, x0 in enumerate([-3.7, -1.85, 0, 1.85, 3.7]):
            x = x0 + rng.uniform(-.30, .30)
            y = y0 + rng.uniform(-.22, .22)
            rx = rng.uniform(1.12, 1.50)
            ry = rng.uniform(1.00, 1.32)
            rz = rng.uniform(.70, .95)
            z = rz + rng.uniform(-.12, .16)
            lobes.append((x, y, z, rx, ry))
            parts.append(ellipsoid((x, y, z), (rx, ry, rz), row * 13 + col + index * 19))
    # Higher cumulus towers sit above the horizontal base; their sides stay upright.
    for col, r in enumerate([1.20, 1.62, 1.82, 1.48, 1.28]):
        x = -3.6 + col * 1.8 + rng.uniform(-.24, .24)
        y = rng.uniform(-.40, .40)
        z = 1.28 + r * .38
        parts.append(ellipsoid((x, y, z), (r * .92, r * .90, r * .92), 70 + col + index * 7))
    # Lower shoulders break up the underside so it reads as a volume from below.
    for col, (x, y) in enumerate([(-3, -.8), (-1.05, .75), (1, -.65), (3.05, .8)]):
        parts.append(ellipsoid((x + rng.uniform(-.15, .15), y, .48),
                               (.92, .83, .65), 110 + col + index * 11))

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
        p += noise.noise_vector(p * 2.4 + Vector((index * 4.3, .2, .8))) * .022
    decimate = obj.modifiers.new('Game mesh', 'DECIMATE')
    decimate.ratio = min(1, 26000 / max(1, len(obj.data.polygons)))
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    # Clean tiny collapsed edges before computing pigment and surface contours.
    obj.data.validate()
    obj.data.update()
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.update()
    bpy.context.view_layer.update()

    # Sun on top, soft reflected light below; underside occlusion reveals the billows.
    tree = BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())
    sun = Vector((-.32, -.49, .86)).normalized()
    lights = [(sun + Vector((x, y, .04))).normalized()
              for x, y in [(-.18, -.12), (.18, -.12), (-.18, .12), (.18, .12)]]
    bounce = [Vector(v).normalized() for v in [(-.4, -.3, -.85), (.4, -.2, -.85),
                                               (-.2, .4, -.85), (.3, .4, -.85)]]
    attr = obj.data.color_attributes.new(name='CloudPigment', type='FLOAT_COLOR', domain='POINT')
    for vertex, color in zip(obj.data.vertices, attr.data):
        p, normal = vertex.co, vertex.normal.normalized()
        visibility = 0
        down = 1 - smoothstep(-.55, .18, normal.z)
        for light in (bounce if down > .5 else lights):
            hit, _, _, _ = tree.ray_cast(p + normal * .035, light, 2.4)
            visibility += .25 if hit is None else 0
        illumination = max(0, normal.dot(sun))
        top_light = smoothstep(-.20, .88, illumination - (1 - visibility) * .48)
        under_light = .10 + visibility * .24 + max(0, normal.dot(bounce[0])) * .22
        amount = top_light * (1 - down) + under_light * down
        wash = noise.noise(p * 2.1 + Vector((index * 3, .6, .2))) * .18
        wash += noise.noise(p * 8.0) * .035
        pigment = shade.lerp(paper, max(0, min(1, amount + wash)))
        pigment = pigment.lerp(deep, (1 - visibility) * .15)
        color.color = (*pigment, 1)
    obj.data.materials.append(paint)
    obj.parent = root
    obj['skipInk'] = True

    # Sparse surface-following contour fragments, instead of triangular wireframes.
    strokes = []
    # Sparse, broken contour arcs follow the underside surface itself.
    for i in [1, 4, 7, 10, 13]:
        x, y, z, rx, ry = lobes[i]
        points = []
        for j in range(24):
            a = math.pi * (.14 + j / 23 * .63) + i * .37
            xx = x + math.cos(a) * rx * .67
            yy = y + math.sin(a) * ry * .67
            hit, normal, _, _ = tree.ray_cast(Vector((xx, yy, -4)), Vector((0, 0, 1)), 12)
            if hit is not None and normal.z < -.30:
                points.append(hit + normal * .009)
        if len(points) < 8:
            continue
        curve = bpy.data.curves.new('soft underside contour', 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth = .006
        curve.bevel_resolution = 1
        spline = curve.splines.new('POLY')
        spline.points.add(len(points) - 1)
        for j, (point, coord) in enumerate(zip(spline.points, points)):
            point.co = (*coord, 1)
            point.radius = .25 + .75 * math.sin(math.pi * j / (len(points) - 1)) ** .5
        stroke = bpy.data.objects.new('underside cloud crease', curve)
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
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art-source/volume-clouds.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', export_extras=True, export_yup=True,
                        export_vertex_color='NAME', export_vertex_color_name='CloudPigment', export_all_vertex_colors=False)
record = {'method': 'local Blender modeling', 'reference': 'user-supplied painted cumulus image; ground-view volume revision',
          'cloudBanks': [root.name for root in roots], 'output': str(OUT),
          'meshVertices': sum(len(obj.data.vertices) for obj in bpy.data.objects if obj.type == 'MESH'),
          'note': 'Horizontal volume with sculpted underside, vertex-painted bounce light and sparse underside strokes; local Blender output, no paid generation submitted.'}
(ROOT / 'art-source/volume-clouds-provenance.json').write_text(json.dumps(record, indent=2))
print('SKY_CLOUDS_READY', json.dumps(record))
