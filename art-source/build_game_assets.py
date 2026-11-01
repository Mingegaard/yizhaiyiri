"""Local, editable game props. Palette and architectural assets come from the supplied courtyard.
Run with Blender in background mode. No network or paid generation is used.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
random.seed(18)
OUT=Path(__file__).resolve().parents[1]/'public/models'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}
for name,col in {'ink':'4c493c','wood':'987653','woodlight':'b69a70','darkwood':'63503d','paper':'eee2bd','red':'a76d59','sage':'81947b','green':'637e6b','gold':'c4ab6b','clay':'a17b60','stone':'b9b5a0','blue':'799697','skin':'e7caa4','rose':'c7947b','hair':'4b4b3b','cream':'e1d5b7','water':'91afa5'}.items():
 c=tuple(int(col[i:i+2],16)/255 for i in (0,2,4)); c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c); m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
 # Emission materials preserve the reference's painted, non-photoreal look.
 nt=m.node_tree; nt.nodes.clear(); em=nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value=(*c,1); o=nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0],o.inputs['Surface']); M[name]=m
current=None

def obj(name,mesh,mat):
 o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); o.data.materials.append(M[mat]); o.parent=current; return o

def box(p,s,mat='wood',r=0,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p); o=bpy.context.object; o.name=mat; o.scale=s; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.rotation_euler[2]=r; o.data.materials.append(M[mat]); o.parent=current
 if bevel:
  mod=o.modifiers.new('Soft hand-finished edges','BEVEL'); mod.width=bevel; mod.segments=2; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def uv(p,s,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=p); o=bpy.context.object; o.scale=s; o.data.materials.append(M[mat]); o.parent=current
 for f in o.data.polygons:f.use_smooth=True
 return o

def line(points,rad=.01,mat='ink'):
 c=bpy.data.curves.new('drawn detail','CURVE'); c.dimensions='3D'; c.bevel_depth=rad; c.bevel_resolution=2; sp=c.splines.new('POLY'); sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new('inkwork',c); bpy.context.collection.objects.link(o); o.data.materials.append(M[mat]); o.parent=current; return o

def ring(p,r,t=.015,mat='gold',rotation=None):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=48,minor_segments=8,location=p); o=bpy.context.object; o.data.materials.append(M[mat]); o.parent=current
 if rotation:o.rotation_euler=rotation
 return o

def lathe(p,profile,mat='clay',n=48):
 verts=[]; faces=[]
 for r,z in profile:
  for i in range(n):a=2*math.pi*i/n;verts.append((p[0]+r*math.cos(a),p[1]+r*math.sin(a),p[2]+z))
 for j in range(len(profile)-1):
  for i in range(n):k=j*n+i; faces.append((k,j*n+(i+1)%n,(j+1)*n+(i+1)%n,k+n))
 mesh=bpy.data.meshes.new('turned shape'); mesh.from_pydata(verts,[],faces); mesh.update(); o=obj('turned '+mat,mesh,mat)
 for f in mesh.polygons:f.use_smooth=True
 return o

def asset(name,fn):
 global current
 current=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(current); current['assetId']=name
 fn()
 # Merge each material into one mesh per asset, keeping named asset roots.
 for mat in M:
  objects=[o for o in current.children if o.type in {'MESH','CURVE'} and o.data.materials and o.data.materials[0]==M[mat]]
  if not objects:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.convert(target='MESH'); bpy.ops.object.join(); bpy.context.object.name=name+'__'+mat
 current=None

def table(w=2.7,d=1.1,h=.95):
 box((0,0,h),(w,d,.12),'wood',bevel=.025);box((0,0,h+.07),(w+.05,d+.05,.04),'woodlight')
 for x in [-w/2+.17,w/2-.17]:
  for y in [-d/2+.13,d/2-.13]:
   box((x,y,h/2),(.12,.12,h),'darkwood');box((x,y,h-.18),(.2,.16,.12),'gold')
  line([(x,-d/2+.13,.3),(x,d/2-.13,.3)],.024,'wood')
 for y in [-d/2+.1,d/2-.1]:
  box((0,y,h-.14),(w-.25,.065,.15),'darkwood');line([(-w/2+.2,y,.31),(w/2-.2,y,.31)],.027,'wood')

def paper(x=0,y=0,z=1.08,standing=False):
 if standing:
  # Folded letter standing on a small wooden support, facing the player.
  box((x,y,z+.45),(.74,.025,.9),'paper',bevel=.008)
  for col in range(5):
   for row in range(7):
    xx=x+.27-col*.13; zz=z+.78-row*.088
    line([(xx,y-.019,zz),(xx-.027,y-.019,zz-.018),(xx+.025,y-.019,zz-.025)],.006,'ink')
  box((x+.24,y-.024,z+.12),(.10,.009,.10),'red',bevel=0)
 else:
  box((x,y,z),(.75,.9,.012),'paper',r=-.08,bevel=.004)
  for col in range(5):
   for row in range(7):
    xx=x+.25-col*.12; yy=y-.3+row*.09
    line([(xx,yy,z+.009),(xx-.024,yy+.028,z+.009),(xx+.018,yy+.035,z+.009)],.004,'ink')
  box((x+.21,y+.30,z+.013),(.09,.08,.003),'red',bevel=0)

def book(p,cover='green',w=.5):
 x,y,z=p;box((x,y,z+.045),(w,.66,.075),'paper');
 for zz in [z,z+.09]:box((x,y,zz),(w+.025,.69,.018),cover,bevel=.005)
 box((x-w/2,y,z+.04),(.025,.69,.1),cover,bevel=.004)
 for yy in [-.23,.23]:box((x-w*.35,y+yy,z+.105),(.045,.035,.009),'gold',bevel=.002)
 for i in range(4):line([(x+w/2+.006,y-.27,z+.017+i*.016),(x+w/2+.006,y+.27,z+.017+i*.016)],.0015,'woodlight')

def scroll(x,y,z,rot=0):
 o=lathe((0,0,0),[(0,0),(.09,0),(.095,.65),(.0,.65)],'paper',32);o.rotation_euler=(math.pi/2,0,rot);o.location=(x,y+.32,z)
 for yy in [-.38,.38]:
  o=lathe((0,0,0),[(.035,0),(.035,.07)],'darkwood',20);o.rotation_euler=(math.pi/2,0,0);o.location=(x,y+yy,z)
 line([(x-.06,y,z+.07),(x+.07,y,z+.07)],.015,'red')

def books(missing):
 table();box((0,0,1.055),(2.45,.85,.02),'green')
 for i in range(5):
  x=(i-2)*.43
  if missing and i==2:box((x,0,1.072),(.34,.66,.005),'darkwood',bevel=0)
  else:scroll(x,0,1.18)
 for i in range(3):book((.8,.65,.14+i*.11),'red' if i==2 else 'green',.45)

def letter(collected=False):
 table();paper(z=1.08,standing=not collected)

def bowl(p=(0,0,0),r=.4,mat='clay'):
 lathe(p,[(0,0),(r*.6,0),(r*.75,.05),(r,.24),(r*.96,.27),(r*.89,.24),(r*.65,.05),(0,.05)],mat)
 ring((p[0],p[1],p[2]+.25),r*.98,.014,'gold')

def vase(p=(0,0,0)):
 lathe(p,[(0,0),(.23,0),(.33,.1),(.42,.35),(.39,.53),(.18,.7),(.16,.95),(.20,1),(.16,1.025),(.135,.97),(.13,.72)],'sage')
 for z,r in [(.08,.27),(.58,.34),(.96,.18)]:ring((p[0],p[1],p[2]+z),r,.012,'gold')

def shoes(missing):
 table(2.5,1,.38)
 for x in [-.84,-.4]:
  if missing:box((x,0,.47),(.31,.62,.008),'darkwood',bevel=.03)
  else:
   uv((x,-.03,.54),(.16,.34,.075),'ink');uv((x,.03,.62),(.145,.24,.14),'darkwood');lathe((x,.14,.63),[(.105,0),(.11,.19),(.08,.21),(.075,.07)],'ink',32)
   line([(x-.1,-.22,.60),(x,-.27,.66),(x+.1,-.22,.60)],.012,'gold')
 if not missing:
  lathe((.65,0,.47),[(0,0),(.36,0),(.35,.08),(.28,.15),(.28,.5),(.0,.52)],'ink')
  box((.65,0,.7),(.6,.5,.27),'ink',bevel=.09);line([(.38,-.23,.68),(.65,-.27,.61),(.92,-.23,.68)],.012,'gold');paper(.1,-.12,.475)

def cloth(p=(0,0,0),mat='cream',scale=1):
 # A curved, double-sided robe with broad sleeves, a crossing collar and ink seams.
 x,y,z=p
 profile=[(-.66,-.12),(-.34,.03),(-.22,.18),(.22,.18),(.34,.03),(.66,-.12),(.57,-.43),(.3,-.37),(.3,-.89),(-.3,-.89),(-.3,-.37),(-.57,-.43)]
 verts=[]
 for yy in [-.035,.035]:
  for xx,zz in profile:verts.append((x+xx*scale,y+yy+math.sin(xx*8)*.018,z+zz*scale))
 faces=[tuple(range(11,-1,-1)),tuple(range(12,24))]+[(i,(i+1)%12,(i+1)%12+12,i+12) for i in range(12)]
 mesh=bpy.data.meshes.new('robe');mesh.from_pydata(verts,[],faces);mesh.update();obj('woven robe',mesh,mat)
 for sign in [-1,1]:
  line([(x+sign*.2*scale,y-.05,z+.12*scale),(x,y-.055,z-.22*scale),(x,y-.055,z-.86*scale)],.013*scale,'woodlight')
  for i in range(3):line([(x+sign*(.07+i*.065)*scale,y-.055,z-.26*scale),(x+sign*(.06+i*.08)*scale,y-.05,z-.83*scale)],.004*scale,'wood')
 line([(x-.29*scale,y-.05,z-.86*scale),(x+.29*scale,y-.05,z-.86*scale)],.013*scale,'gold')

def tile(state):
 if state=='fragments':
  for i in range(7):
   o=box(((i%3-1)*.38,(i//3)*.32,.08),(.3,.4,.06),'clay',r=i*.7,bevel=.014)
  box((-1,.4,1.3),(.2,.22,2.6),'red');return
 table()
 if state=='covered':
  cloth((0,0,2.05),'sage',1.5);return
 # Curved roof tile, ridged clay, hand-painted face, cloth and paper headdress.
 lathe((0,0,1.08),[(0,0),(.16,0),(.2,.06),(.17,.13)],'wood',32)
 verts=[];faces=[]
 for zz in [1.13,2.27]:
  for i in range(21):a=-.65+i*1.3/20;verts.append((math.sin(a)*.5,math.cos(a)*.5-.5,zz))
 for i in range(20):faces.append((i,i+1,i+22,i+21))
 mesh=bpy.data.meshes.new('curved fired tile');mesh.from_pydata(verts,[],faces);mesh.update();o=obj('curved tile',mesh,'clay');mod=o.modifiers.new('Terracotta thickness','SOLIDIFY');mod.thickness=.065;bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name)
 for zz in [2.13,2.18,2.23]:line([(-.27,-.08,zz),(0,.005,zz+.018),(.27,-.08,zz)],.009,'woodlight')
 cloth((0,-.14,1.67),'cream',.85)
 for sign in [-1,1]:
  line([(sign*.08,-.043,2.02),(sign*.14,-.05,2.05),(sign*.21,-.06,2.02)],.014,'ink');uv((sign*.14,-.054,1.96),(.023,.015,.018),'ink')
 line([(-.09,-.025,1.85),(0,-.02,1.82),(.10,-.025,1.85)],.009,'ink')
 box((0,0,2.29),(.67,.4,.08),'paper',bevel=.014)
 for sign in [-1,1]:
  o=box((sign*.17,0,2.42),(.33,.36,.035),'paper',bevel=.005);o.rotation_euler[1]=sign*.55
 line([(-.3,-.22,2.31),(0,-.22,2.36),(.3,-.22,2.31)],.008,'woodlight')

def clothes(hanging):
 if hanging:
  cloth((-.8,.34,2.35),'sage');cloth((.8,.33,2.5),'red')
 else:
  table(2.5,1,.38)
  for x,mat in [(-.6,'sage'),(.6,'red')]:
   for i in range(3):box((x,0,.5+i*.06),(.65,.6,.055),mat,bevel=.025)

def vessels(released):
 table();bowl((-.7 if released else 0,0,1.08),.34,'blue');vase((.7 if released else 0,0,1.08 if released else 1.23))

def chest(state):
 table(2.7,1.5,.38)
 box((0,0,.52),(2,1.1,.13),'darkwood')
 for z in [.67,.86,1.05]:
  for y in [-.49,.49]:box((0,y,z),(2,.12,.18),'wood')
  for x in [-.94,.94]:box((x,0,z),(.12,.92,.18),'wood')
 for x in [-.68,.68]:
  for y in [-.56,.56]:
   box((x,y,.87),(.10,.025,.7),'gold',bevel=.005)
   for z in [.62,.82,1.1]:uv((x,y+(-.02 if y<0 else .02),z),(.025,.014,.025),'darkwood')
 # Articulated lid authored in its open or closed state.
 z=1.24 if state=='closed' else 1.6;lid=box((0,0 if state=='closed' else .49,z),(2.12,1.17,.10),'woodlight');
 if state!='closed':lid.rotation_euler[0]=1.22
 if state=='closed':box((0,-.59,1.12),(.18,.04,.3),'gold');ring((0,-.63,1.03),.07,.018,'darkwood',(math.pi/2,0,0))
 else:
  paper(-.2,0,1.26);bowl((.55,.08,.6),.24,'sage');book((-.5,.1,.62),'red',.35)
  if state=='verified':paper(0,-.95,.49)

def luggage(letter):
 box((-.4,0,.43),(1.1,.8,.86),'woodlight',bevel=.06)
 for z in [.1,.26,.42,.58,.74]:line([(-.94,-.412,z),(.14,-.412,z)],.008,'wood')
 for x in [-.73,-.08]:
  box((x,0,.88),(.085,.84,.035),'darkwood');box((x,-.42,.43),(.085,.02,.86),'darkwood')
 uv((.65,0,.35),(.43,.4,.34),'sage');line([(.63,0,.65),(.8,.12,.8),(.65,.16,.82),(.5,.08,.66)],.034,'green')
 if letter:paper(-.4,0,.92)

def dogs(empty):
 for x in [-.65,.65]:
  bowl((x,0,.02),.45,'clay')
  for i in range(8):
   a=i*math.pi/4;line([(x+.43*math.cos(a),.43*math.sin(a),.19),(x+.40*math.cos(a),.40*math.sin(a),.12)],.006,'woodlight')
  if not empty:
   for i in range(24):a=i*2.4;r=.28*math.sqrt(i/24);uv((x+math.cos(a)*r,math.sin(a)*r,.10),(.035,.025,.023),'woodlight')

def river(found):
 # Soft bank contours, water ripples and a handled bronze cooking pot.
 for i in range(7):
  x=(i-3)*.65;uv((x,.7,.02),(.6,.6,.09),'stone');line([(x-.24,.5,.08),(x-.1,.6,.14),(x+.2,.55,.09)],.008,'woodlight')
 if found:
  lathe((0,-.2,.1),[(0,0),(.28,0),(.40,.1),(.46,.3),(.46,.36),(.4,.36),(.36,.12),(0,.07)],'ink')
  ring((0,-.2,.46),.46,.035,'gold')
  for x in [-.58,.58]:ring((x,-.2,.35),.14,.035,'ink',(math.pi/2,0,0))

def interior(kitchen=False):
 if kitchen:
  # Plaster stove, tiled firebox, cooking pot, pantry shelves and hanging utensils.
  box((1.7,2.5,.60),(1.3,1.2,1.2),'stone',bevel=.04);box((1.7,2.5,1.23),(1.4,1.3,.1),'darkwood');box((1.7,1.87,.4),(.64,.025,.46),'ink',bevel=.09)
  lathe((1.7,2.5,1.28),[(0,0),(.38,0),(.48,.26),(.0,.28)],'ink');ring((1.7,2.5,1.55),.46,.02,'gold')
  for x in [-2.3,-1.1]:
   for z in [.15,.65,1.2,1.8]:box((x,2.6,z),(.8,.65,.07),'wood')
   for xx in [-.36,.36]:box((x+xx,2.6,1),(.06,.6,2),'darkwood')
   for z in [.2,.7,1.25]:bowl((x,2.6,z),.21,'sage')
  line([(-2.8,3,2.5),(2.8,3,2.5)],.035,'darkwood')
  for x in [.3,.9]:ring((x,2.96,2.1),.13,.025,'gold',(math.pi/2,0,0));line([(x,2.96,2.23),(x,2.96,2.52)],.025,'wood')
 else:
  box((1.45,1.8,.37),(1.75,2.5,.34),'darkwood',bevel=.03);box((1.45,1.8,.6),(1.7,2.4,.13),'sage',bevel=.05);box((1.45,2.6,.77),(1,.43,.18),'cream',bevel=.08)
  for x in [.63,2.27]:
   for y in [.65,2.95]:line([(x,y,.2),(x,y,2.65)],.055,'red')
  for x in [.63,2.27]:line([(x,.65,2.65),(x,2.95,2.65)],.045,'darkwood')
  box((1.45,2.95,1.33),(1.7,.07,1.9),'paper',bevel=.01)
  for i in range(12):line([(.7+i*.135,2.90,.55),(.7+i*.135,2.9,2.26)],.005,'woodlight')

def companion(cook=False):
 # Small Tang-robed courtyard companion: cross collar, pleats, cloth cap and letter.
 lathe((0,0,0),[(0,.13),(.30,.13),(.36,.22),(.27,.65),(.18,.82),(0,.83)],'sage')
 for sign in [-1,1]:
  o=uv((sign*.29,0,.66),(.18,.15,.3),'sage');o.rotation_euler[1]=sign*.55
  uv((sign*.38,-.07,.52),(.07,.07,.08),'skin');uv((sign*.13,-.07,.12),(.12,.19,.06),'ink')
  line([(sign*.10,-.19,.78),(0,-.29,.58),(sign*.12,-.32,.21)],.018,'cream')
  for i in range(3):line([(sign*(.05+i*.06),-.26,.5),(sign*(.05+i*.09),-.28,.21)],.004,'green')
 uv((0,0,1.06),(.29,.24,.29),'skin');uv((0,.03,1.25),(.30,.24,.12),'hair')
 lathe((0,.025,1.26),[(.0,0),(.3,0),(.29,.05),(.20,.16),(.0,.17)],'green')
 box((0,-.23,1.28),(.44,.03,.08),'darkwood',bevel=.02);box((0,-.25,1.28),(.08,.02,.055),'gold')
 for x in [-.10,.10]:
  uv((x,-.231,1.06),(.021,.012,.027),'ink');uv((x*1.6,-.217,.995),(.045,.013,.022),'rose')
 line([(-.05,-.235,.955),(0,-.247,.945),(.05,-.235,.955)],.008,'ink')
 box((0,-.30,.43),(.47,.028,.23),'paper',r=.08,bevel=.01)
 if cook:line([(.38,-.08,.55),(.52,-.1,1.02)],.025,'wood');bowl((.52,-.10,1.02),.07,'wood')

def tally():
 uv((0,0,.026),(.075,.058,.025),'gold')
 uv((0,-.072,.03),(.018,.026,.018),'gold')
 for x in [-.057,.057]:
  for y in [-.043,.043]:uv((x,y,.009),(.024,.016,.009),'woodlight')
 for x in [-.009,.009]:uv((x,-.092,.036),(.002,.003,.002),'ink')
 for i in range(6):
  a=i*math.pi/3;ring((math.sin(a)*.036,math.cos(a)*.028,.045),.015,.0008,'woodlight')
 lathe((0,0,.048),[(0,0),(.033,0),(.037,.019),(.03,.025)],'gold',48)
 for i in range(12):
  a=i*math.pi/6; o=uv((math.sin(a)*.036,math.cos(a)*.036,.077),(.012,.023,.006),'woodlight');o.rotation_euler[2]=-a
 lathe((0,0,.085),[(.03,0),(.034,.01),(.034,.21),(.031,.217),(.028,.21),(.028,.025),(0,.025)],'gold',64)
 for z in [.09,.108,.24,.255,.3]:ring((0,0,z),.034,.0018,'woodlight')
 for z in [.14,.19,.27]:
  for i in range(8):
   a=i*math.pi/4;pts=[]
   for j in range(28):
    t=j/27*math.pi*2.8;r=.007*(1-j/32);aa=a+math.cos(t)*r/.034;pts.append((math.sin(aa)*.0348,math.cos(aa)*.0348,z+math.sin(t)*r))
   line(pts,.0007,'woodlight')
 lathe((.052,0,.29),[(0,0),(.037,0),(.036,.007),(.029,.022),(.012,.029),(0,.029)],'woodlight',48)
 uv((.052,0,.326),(.007,.007,.009),'gold')

def cloud():
 for x,z,r in [(-.34,0,.20),(-.16,.08,.25),(.1,.08,.27),(.35,0,.18),(0,-.06,.24)]:
  uv((x,0,z),(r,r*.36,r*.62),'paper')
 for x in [-.17,.13]:
  pts=[]
  for j in range(64):
   a=j/63*math.pi*3;r=.15*(1-j/73);pts.append((x+math.cos(a)*r,-.10,.04+math.sin(a)*r*.7))
  line(pts,.009,'gold')

for n,fn in {
 'tally_vessel':tally,'cloud_cluster':cloud,
 'books_missing':lambda:books(True),'books_returned':lambda:books(False),'letter_visible':lambda:letter(False),'letter_collected':lambda:letter(True),
 'shoes_missing':lambda:shoes(True),'shoes_returned':lambda:shoes(False),'tile_covered':lambda:tile('covered'),'tile_whole':lambda:tile('whole'),'tile_fragments':lambda:tile('fragments'),
 'clothes_hanging':lambda:clothes(True),'clothes_returned':lambda:clothes(False),'vessels_nested':lambda:vessels(False),'vessels_released':lambda:vessels(True),
 'luggage_packed':lambda:luggage(False),'luggage_letter':lambda:luggage(True),'dogs_bowls':lambda:dogs(False),'dogs_bowls_empty':lambda:dogs(True),
 'chest_closed':lambda:chest('closed'),'chest_open':lambda:chest('open'),'chest_verified':lambda:chest('verified'),
 'pot_hidden':lambda:river(False),'pot_found':lambda:river(True),'kitchen_furniture':lambda:interior(True),'bedroom_furniture':lambda:interior(False),
 'companion_idle':lambda:companion(False),'companion_cooking':lambda:companion(True),
}.items():asset(n,fn)
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT.parents[1]/'art-source/game-props.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'tang-game-props.glb'),export_format='GLB',export_extras=True,export_yup=True)
print('GAME_ASSETS_READY',len([o for o in bpy.data.objects if o.type=='EMPTY']))
