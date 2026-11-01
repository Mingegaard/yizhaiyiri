"""Normalize the Lux3D-rigged idle GLB without replacing its skin or animation.

First import: blender -b --python build_silverhook.py -- --source /path/to/idle.glb
Re-export: blender -b --python build_silverhook.py
The game's StudySilverHook renderer supplies muted pigment and animated ink.
"""
import argparse
import json
import pathlib
import re
import sys

import bpy
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLEND = ROOT / 'art-source/silverhook-study.blend'
OUTPUT = ROOT / 'public/models/silverhook-study-idle.glb'
parser = argparse.ArgumentParser()
parser.add_argument('--source')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

if args.source:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(pathlib.Path(args.source).resolve()))
    # This stylized mesh has broad cuffs and joined fingers. Keep the imported
    # neutral wrists/fingers instead of the preset's clenched fists, which pinch the cloth.
    finger_pattern = re.compile(r'(?:Left|Right)Hand')
    for action in bpy.data.actions:
        for layer in action.layers:
            for strip in layer.strips:
                for channelbag in strip.channelbags:
                    for curve in list(channelbag.fcurves):
                        if finger_pattern.search(curve.data_path):
                            channelbag.fcurves.remove(curve)
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            for bone in obj.pose.bones:
                if finger_pattern.search(bone.name):
                    bone.matrix_basis.identity()
    # Auto-rigging assigns a few cuff vertices to fingers. Keep cloth on the
    # forearm side of each wrist attached to the forearm, without changing the mesh.
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        modifier = next((item for item in obj.modifiers if item.type == 'ARMATURE'), None)
        if not modifier:
            continue
        armature = modifier.object
        to_armature = armature.matrix_world.inverted() @ obj.matrix_world
        for side in ('Left', 'Right'):
            hand = next(bone for bone in armature.data.bones if bone.name.endswith(side + 'Hand'))
            forearm = hand.parent
            axis = (hand.head_local - forearm.head_local).normalized()
            hand_groups = {group.index for group in obj.vertex_groups if side + 'Hand' in group.name}
            target = obj.vertex_groups.get(forearm.name)
            repaired = 0
            for vertex in obj.data.vertices:
                delta = to_armature @ vertex.co - hand.head_local
                if delta.dot(axis) >= 0 or delta.length > forearm.length * .72:
                    continue
                amount = sum(group.weight for group in vertex.groups if group.group in hand_groups)
                if amount <= .00001:
                    continue
                for index in hand_groups:
                    obj.vertex_groups[index].remove([vertex.index])
                target.add([vertex.index], amount, 'ADD')
                repaired += 1
            print('CUFF_WEIGHT_REPAIR', side, repaired)
    bpy.context.scene.frame_set(bpy.context.scene.frame_start)
    bpy.context.view_layer.update()
    # The importer also creates a hidden Icosphere for bone handles; it is not body geometry.
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH'
              and any(modifier.type == 'ARMATURE' for modifier in obj.modifiers)]
    assert meshes, 'No skinned character geometry'
    # Imported armatures can leave an unevaluated [-1, 1] placeholder bounding box.
    # Measure the actual posed vertices, including the skin modifier.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        posed = evaluated.to_mesh()
        points.extend(evaluated.matrix_world @ vertex.co for vertex in posed.vertices)
        evaluated.to_mesh_clear()
    low = Vector([min(point[i] for point in points) for i in range(3)])
    high = Vector([max(point[i] for point in points) for i in range(3)])
    height = high.z - low.z
    assert height > 0
    root = bpy.data.objects.new('SilverHook_Grounded_1_25m', None)
    bpy.context.collection.objects.link(root)
    for obj in list(bpy.context.scene.objects):
        if obj != root and obj.parent is None:
            obj.parent = root
    scale = 1.25 / height
    print('POSED_CHARACTER_HEIGHT', height, 'NORMALIZATION_SCALE', scale)
    root.scale = (scale,) * 3
    root.location = Vector([-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z]) * scale
    bpy.context.view_layer.update()
    # Keep only the color image. Metal/roughness and normal maps have no role in ink painting.
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        principled = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
        if principled:
            for socket in ('Metallic', 'Roughness', 'Normal'):
                for link in list(principled.inputs[socket].links):
                    material.node_tree.links.remove(link)
            principled.inputs['Metallic'].default_value = 0
            principled.inputs['Roughness'].default_value = 1
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
else:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))

assert any(obj.type == 'ARMATURE' for obj in bpy.context.scene.objects), 'Missing Lux3D skeleton'
assert bpy.data.actions, 'Missing Lux3D idle action'
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT), export_format='GLB', export_animations=True,
    export_animation_mode='NLA_TRACKS', export_force_sampling=True,
    export_optimize_animation_size=True,
)
print('SILVERHOOK_EXPORT', json.dumps({
    'output': str(OUTPUT), 'bytes': OUTPUT.stat().st_size,
    'armatures': [obj.name for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'],
    'actions': [action.name for action in bpy.data.actions],
}))
