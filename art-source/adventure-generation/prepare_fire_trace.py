"""Normalize only the newly generated evidence prop; preserve all existing models."""
from pathlib import Path
import bpy, numpy as np, json, sys
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/adventure-generation/originals/fire-trace_glb.glb'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
center=(lo+hi)/2; size=hi-lo
colors=['464137','655b49','897a60','ab9977','c1b393']
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
palette=[tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4)) for h in colors]
mat=bpy.data.materials.new('fire_trace_flat_pigment');mat.use_nodes=True
mat.node_tree.nodes.clear();out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');em=mat.node_tree.nodes.new('ShaderNodeEmission');col=mat.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='pigment'
mat.node_tree.links.new(col.outputs['Color'],em.inputs['Color']);mat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
for n,obj in enumerate(meshes):
 matrix=obj.matrix_world.copy();uv=obj.data.uv_layers.active;samples={};base=[]
 for i,old in enumerate(obj.data.materials):
  base.append(tuple(old.diffuse_color[:3]))
  if old.use_nodes:
   tex=next((t for t in old.node_tree.nodes if t.type=='TEX_IMAGE' and t.image),None)
   if tex:
    w,h=tex.image.size;samples[i]=(np.array(tex.image.pixels[:],dtype=np.float32).reshape(h,w,4),w,h)
 rgba=np.ones((len(obj.data.loops),4),dtype=np.float32)
 for face in obj.data.polygons:
  rgb=base[face.material_index] if base else (.5,.5,.5)
  if uv and face.material_index in samples:
   pixels,w,h=samples[face.material_index]
   u=sum(uv.data[i].uv.x for i in face.loop_indices)/len(face.loop_indices);v=sum(uv.data[i].uv.y for i in face.loop_indices)/len(face.loop_indices)
   rgb=pixels[min(h-1,int((v%1)*h)),min(w-1,int((u%1)*w)),:3]
  luminance=float(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])
  idx=0 if luminance<.13 else 1 if luminance<.27 else 2 if luminance<.47 else 3 if luminance<.68 else 4
  for loop in face.loop_indices:rgba[loop,:3]=palette[idx]
  face.material_index=0;face.use_smooth=False
 for v in obj.data.vertices:
  p=matrix@v.co;v.co=((p.x-center.x)*1.8/max(size.x,.001),(p.y-center.y)*1.35/max(size.y,.001),(p.z-lo.z)*.025/max(size.z,.001))
 obj.parent=None;obj.matrix_world.identity();obj.name='adventure_fire_trace_'+str(n);obj['lux3dTaskId']='4539243';obj['inkThreshold']=75
 obj.data.materials.clear();obj.data.materials.append(mat)
 attr=obj.data.color_attributes.new(name='pigment',type='FLOAT_COLOR',domain='CORNER');attr.data.foreach_set('color',rgba.ravel())
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
output=ROOT/'public/models/story/fire-trace.glb';output.parent.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_yup=True,export_extras=True,export_vertex_color='ACTIVE')
sys.path.insert(0,'/Users/gaomingze1/Documents/ChatGPT/hackathon/source')
from gltf_unlit import make_unlit
make_unlit(output)
# Visual inspection of the treated prop, independent of the user's courtyard.
bpy.ops.object.camera_add(location=(1.7,-2.5,3));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.7
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.resolution_x=800;scene.render.resolution_y=680;scene.render.resolution_percentage=100
scene.world.color=(.68,.64,.53);scene.view_settings.view_transform='Standard';scene.render.filepath='/tmp/yizhaiyiri-adventure-20261101/fire-trace-treated.png';bpy.ops.render.render(write_still=True)
(ROOT/'art-source/adventure-generation/treatment.json').write_text(json.dumps({'sourceTaskId':'4539243','originalBounds':[list(lo),list(hi)],'dimensionsMetres':[1.8,.025,1.35],'material':'five flat vertex pigments, unlit','output':str(output),'triangles':sum(len(o.data.polygons) for o in meshes),'existingModelsModified':False},indent=2))
