"""Original deterministic studio assets. Blender 4.3+, no reference-frame pixels.

blender -b -t 4 -P scripts/generate-editorial-assets.py -- --size 1600 --samples 48
Objects are modeled here except the attributed museum head mesh. Every material,
camera and light is new; checked-in PNGs make playback independent of Blender.
"""
import argparse
import math
import os
import random
import sys
import bpy
from mathutils import Vector, Matrix

parser = argparse.ArgumentParser()
parser.add_argument("--only", default="")
parser.add_argument("--size", type=int, default=1600)
parser.add_argument("--samples", type=int, default=48)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
OUT = os.path.join(os.getcwd(), "public/references/editorial-generated-v2")
os.makedirs(OUT, exist_ok=True)
random.seed(241017)
PI = math.pi


def material(name, color, metal=0, rough=.4, texture=0):
    mat = bpy.data.materials.new(name)
    mat.use_fake_user = True
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    if texture:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 95
        noise.inputs["Detail"].default_value = 3
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = texture
        bump.inputs["Distance"].default_value = .025
        mat.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def smooth(obj, mat=None):
    if mat:
        obj.data.materials.append(mat)
    if obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


def uv(name, loc, scale, mat, segments=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return smooth(obj, mat)


def box(name, loc, scale, mat, bevel=.05):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Machined soft edge", "BEVEL")
        mod.width = bevel
        mod.segments = 4
        obj.modifiers.new("Weighted studio normals", "WEIGHTED_NORMAL")
    return smooth(obj, mat)


def lathe(name, profile, mat, loc=(0, 0, 0), sides=96):
    verts = []
    for radius, z in profile:
        for j in range(sides):
            angle = j * 2 * PI / sides
            verts.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = []
    for ring in range(len(profile) - 1):
        for j in range(sides):
            a = ring * sides + j
            b = ring * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    return smooth(obj, mat)


def tube(name, points, radius, mat, cyclic=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 12
    data.bevel_depth = radius
    data.bevel_resolution = 4
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def cylinder(name, loc, radius, depth, mat, axis="Z"):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    if axis == "Y":
        obj.rotation_euler.x = PI / 2
    if axis == "X":
        obj.rotation_euler.y = PI / 2
    bevel = obj.modifiers.new("Edge glint", "BEVEL")
    bevel.width = min(.025, depth * .13)
    bevel.segments = 3
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return smooth(obj, mat)


def text(name, words, loc, size, mat):
    data = bpy.data.curves.new(name, "FONT")
    data.body = words
    data.size = size
    data.extrude = .0005
    data.align_x = "CENTER"
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler.x = PI / 2
    obj.data.materials.append(mat)
    return obj


def boolean_cut(obj, cutter):
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("Anatomical cavity", "BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def bust():
    # Licensed CC0 geometry, original black-basalt material and studio render.
    master = os.path.join(os.getcwd(), "assets/editorial-models/marble-bust/marble_bust_01.gltf")
    bpy.ops.import_scene.gltf(filepath=master)
    meshes = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("The attributed sculpture master contains no mesh")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    world = obj.matrix_world.copy()
    obj.data.transform(world)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.name = "Original obsidian studio render — CC0 Poly Haven geometry"
    obj.data.materials.clear()
    smooth(obj, sculpture)
    bpy.context.view_layer.update()
    extent = max(obj.dimensions)
    obj.scale *= 3.5 / extent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.context.view_layer.update()
    bounds = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    obj.location.x -= (min(v.x for v in bounds) + max(v.x for v in bounds)) / 2
    obj.location.y -= (min(v.y for v in bounds) + max(v.y for v in bounds)) / 2
    obj.location.z -= min(v.z for v in bounds)
    normal_file = os.path.join(os.path.dirname(master), "textures/marble_bust_01_nor_gl_2k.jpg")
    nodes = sculpture.node_tree.nodes
    image = nodes.new("ShaderNodeTexImage")
    image.image = bpy.data.images.load(normal_file)
    image.image.colorspace_settings.name = "Non-Color"
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = .75
    sculpture.node_tree.links.new(image.outputs["Color"], normal.inputs["Color"])
    sculpture.node_tree.links.new(normal.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])
    return (4, -8, 3.7)


def chess(queen=False):
    mat = ivory if queen else black
    profile = [(0, 0), (.7, 0), (.73, .08), (.69, .17), (.59, .24), (.61, .31),
               (.5, .4), (.36, .53), (.25, .7), (.19, 1.2), (.25, 1.48),
               (.42, 1.57), (.43, 1.65), (.32, 1.73), (.39, 2.05), (.48, 2.24),
               (.45, 2.34), (.26, 2.37), (0, 2.37)]
    lathe("Queen" if queen else "King", profile, mat)
    if queen:
        for i in range(8):
            a = i / 8 * 2 * PI
            tube("Crown prong", [(.36 * math.cos(a), .36 * math.sin(a), 2.2),
                                  (.43 * math.cos(a), .43 * math.sin(a), 2.49)], .055, mat)
            uv("Crown bead", (.43 * math.cos(a), .43 * math.sin(a), 2.5), (.08, .08, .08), mat, 24, 16)
        uv("Crown pearl", (0, 0, 2.48), (.12, .12, .12), mat)
    else:
        box("King cross stem", (0, 0, 2.62), (.12, .15, .5), mat, .025)
        box("King cross arm", (0, 0, 2.7), (.42, .15, .12), mat, .025)
    return (4.5, -9, 4)



def target():
    # Axis along Y, blue enamel bullseye and a real arrow through the centre.
    for i, radius in enumerate([1.03, .82, .61, .4, .19]):
        cylinder("Concentric enamel", (0, -.04 - i * .027, 1.35), radius, .18, cobalt if i % 2 == 0 else ivory, "Y")
    tube("Arrow shaft", [(0, -.23, 1.35), (-.5, -1.45, 2.2)], .025, steel)
    for angle in [0, 2 * PI / 3, 4 * PI / 3]:
        a = Vector((-.5, -1.45, 2.2))
        points = [a, a + Vector((.15 * math.cos(angle), -.2, .15 * math.sin(angle))), a + Vector((.13 * math.cos(angle), .15, .13 * math.sin(angle)))]
        mesh = bpy.data.meshes.new("Flight")
        mesh.from_pydata(points, [], [(0, 1, 2)])
        obj = bpy.data.objects.new("Arrow flight", mesh)
        bpy.context.collection.objects.link(obj)
        smooth(obj, ivory)
    return (4.5, -8, 3.5)


def camera():
    box("Camera body", (0, 0, 1.1), (1.85, .65, 1.2), black, .12)
    box("Viewfinder", (-.05, 0, 1.8), (.65, .5, .3), black, .06)
    box("Leather grip", (.7, -.18, 1.12), (.48, .55, 1.15), rubber, .14)
    for y, radius, depth, mat in [(-.45, .64, .18, black), (-.62, .6, .22, rubber), (-.8, .56, .15, steel), (-.9, .5, .1, black), (-.96, .42, .025, glass)]:
        cylinder("Lens barrel", (-.14, y, 1.1), radius, depth, mat, "Y")
    for i in range(48):
        a = i / 48 * 2 * PI
        box("Focus ring rib", (-.14 + .603 * math.cos(a), -.65, 1.1 + .603 * math.sin(a)), (.025, .12, .025), grey, .005)
    cylinder("Shutter", (.6, -.07, 1.77), .1, .06, steel)
    text("Brand engraving", "FRAME / 01", (-.35, -.332, 1.53), .085, ivory)
    return (3, -8, 3.5)


def clock():
    cylinder("Clock housing", (0, 0, 1.3), 1.1, .32, black, "Y")
    cylinder("Brass bezel", (0, -.18, 1.3), 1.04, .055, brass, "Y")
    cylinder("Ivory dial", (0, -.22, 1.3), .96, .022, ivory, "Y")
    for i in range(60):
        angle = i / 60 * 2 * PI
        length = .12 if i % 5 == 0 else .045
        tube("Dial tick", [(.87 * math.sin(angle), -.24, 1.3 + .87 * math.cos(angle)), ((.87 - length) * math.sin(angle), -.24, 1.3 + (.87 - length) * math.cos(angle))], .012 if i % 5 == 0 else .004, black)
    for hour in range(1, 13):
        angle = hour / 12 * 2 * PI
        text("Hour numeral", str(hour), (.69 * math.sin(angle), -.25, 1.3 + .69 * math.cos(angle) - .05), .14, black)
    tube("Hour hand", [(0, -.27, 1.3), (-.32, -.27, 1.65)], .027, black)
    tube("Minute hand", [(0, -.28, 1.3), (.61, -.28, 1.62)], .018, black)
    tube("Seconds", [(-.15, -.29, 1.08), (.47, -.29, 1.94)], .006, red)
    uv("Hand pin", (0, -.3, 1.3), (.05, .025, .05), brass)
    tube("Clock handle", [(-.36, 0, 2.34), (-.35, 0, 2.55), (.35, 0, 2.55), (.36, 0, 2.34)], .045, brass)
    for x in [-.64, .64]:
        box("Clock foot", (x, .03, .25), (.2, .24, .3), black, .035)
    return (3.5, -9, 3.7)


def phone():
    box("Phone titanium frame", (0, 0, 2.45), (2.8, .18, 1.43), steel, .16)
    box("Phone black bezel", (0, -.1, 2.45), (2.72, .055, 1.36), black, .13)
    box("Screen glass", (0, -.14, 2.45), (2.56, .015, 1.22), screen, .1)
    # An original camera-app screen, authored as objects, no screenshot texture.
    for x in [-.42, .42]:
        box("Rule-of-thirds", (x, -.154, 2.45), (.005, .002, 1.02), ivory, 0)
    for z in [2.25, 2.66]:
        box("Rule-of-thirds", (0, -.154, z), (2.15, .002, .005), ivory, 0)
    for x in [-.29, .29]:
        box("Viewfinder corner horizontal", (x, -.157, 2.74), (.12, .002, .012), brass, 0)
        box("Viewfinder corner horizontal", (x, -.157, 2.16), (.12, .002, .012), brass, 0)
    cylinder("Recording indicator", (-1.02, -.16, 2.91), .028, .004, red, "Y")
    text("Camera recording UI", "REC  00:18", (-.7, -.16, 2.87), .085, ivory)
    text("Camera settings UI", "4K / 60     F2.8     ISO 100", (-.1, -.16, 2), .067, ivory)
    cylinder("Shutter button", (1.12, -.16, 2.45), .095, .008, ivory, "Y")
    cylinder("Record button", (1.12, -.17, 2.45), .065, .009, red, "Y")
    box("Phone clamp", (0, .15, 2.5), (.52, .35, 1.6), black, .08)
    cylinder("Gimbal roll motor", (.1, .4, 1.7), .24, .4, black, "Y")
    tube("Gimbal support", [(.1, .42, 1.7), (.65, .42, 1.7), (.65, .42, 1.18), (.1, .42, 1.02)], .09, black)
    cylinder("Gimbal yaw motor", (.1, .42, 1.02), .24, .26, black)
    cylinder("Gimbal grip", (.1, .42, .42), .13, .9, rubber)
    return (3.8, -9, 3.8)


def laptop():
    box("Aluminium unibody", (0, 0, .16), (2.8, 1.9, .12), steel, .08)
    box("Keyboard bed", (0, .12, .23), (2.45, 1.05, .025), black, .04)
    for row in range(5):
        for col in range(13):
            box("Individual key", (-1.11 + col * .184, -.24 + row * .18, .255), (.153, .14, .028), rubber, .014)
    box("Trackpad", (0, -.64, .235), (.84, .44, .012), grey, .035)
    box("Display housing", (0, .87, 1.16), (2.8, .12, 1.9), black, .075)
    box("Display glass", (0, .798, 1.16), (2.62, .015, 1.72), screen, .035)
    text("Original screen title", "MAKE IT MATTER.", (0, .783, 1.7), .19, ivory)
    text("Original screen subtitle", "CREATE WITH INTENTION", (0, .783, 1.46), .069, ivory)
    for i in range(7):
        box("Timeline track", (-.23 + (i % 3) * .19, .78, .59 + i * .075), (1.6 - i * .13, .005, .046), teal if i % 3 else red, .006)
    return (4, -8, 4.1)


def eye():
    uv("Sclera", (0, 0, 1.2), (1, .76, .84), ivory, 96, 64)
    cylinder("Iris", (0, -.72, 1.2), .43, .045, iris, "Y")
    for i in range(108):
        a = i * 2 * PI / 108
        tube("Iris fibre", [(.17 * math.sin(a), -.752, 1.2 + .17 * math.cos(a)), (.39 * math.sin(a + .035), -.748, 1.2 + .39 * math.cos(a + .035))], .007, black if i % 3 else brass)
    cylinder("Pupil", (0, -.766, 1.2), .165, .03, dark, "Y")
    uv("Corneal glint", (-.12, -.8, 1.39), (.08, .015, .07), ivory)
    for i in range(8):
        z = .7 + i * .14
        tube("Fine scleral vein", [(-.9, -.3, z), (-.7, -.52, z + .03), (-.6, -.61, z + .08)], .003, red)
    return (2, -9, 2.8)


def foil():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=48)
    obj = bpy.context.object
    obj.name = "Original crumpled foil"
    for v in obj.data.vertices:
        p = v.co
        noise = math.sin(p.x * 21 + p.z * 17) * math.cos(p.y * 17 + p.x * 12) * .12
        noise += math.sin(p.z * 33 - p.y * 24) * .05
        v.co *= 1 + noise
        v.co.z *= 1.4
    obj.location.z = 1.5
    smooth(obj, steel)
    return (4, -8, 3.2)


def flowers():
    for i in range(4):
        x, y, top = -.5 + i * .34, (i % 2) * .18, 2.5 + math.sin(i * 2) * .35
        tube("Botanical stem", [(x * .4, 0, .1), (x, y, top * .6), (x, y, top)], .018, green)
        for j in range(6):
            a = j / 6 * 2 * PI
            petal = uv("Lily petal", (x + .22 * math.sin(a), y + .22 * math.cos(a), top + .04), (.12, .34, .075), petal_mat)
            petal.rotation_euler.z = -a
            petal.rotation_euler.x = .25
        for j in range(5):
            a = j / 5 * 2 * PI
            tube("Filament", [(x, y, top), (x + .07 * math.sin(a), y + .07 * math.cos(a), top + .22)], .006, ivory)
            uv("Anther", (x + .07 * math.sin(a), y + .07 * math.cos(a), top + .22), (.025, .025, .035), brass, 24, 16)
        leaf = uv("Long leaf", (x + .15, y, top * .38), (.07, .028, .6), green)
        leaf.rotation_euler.y = .4
    return (2.2, -8, 3)


def studio(name, builder):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    direction = builder()
    meshes = [o for o in bpy.context.scene.objects if o.type in {"MESH", "CURVE", "FONT"}]
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    # Update matrices before computing the silhouette bounds.
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    center = Vector(tuple((min(v[i] for v in points) + max(v[i] for v in points)) / 2 for i in range(3)))
    bpy.ops.object.camera_add()
    camera_obj = bpy.context.object
    camera_obj.location = center + Vector(direction)
    camera_obj.rotation_euler = (center - camera_obj.location).to_track_quat("-Z", "Y").to_euler()
    camera_obj.data.type = "ORTHO"
    rotation = camera_obj.rotation_euler.to_matrix().transposed()
    projected = [rotation @ (p - center) for p in points]
    camera_obj.data.ortho_scale = max(max(p.x for p in projected) - min(p.x for p in projected), max(p.y for p in projected) - min(p.y for p in projected)) * 1.12
    bpy.context.scene.camera = camera_obj
    for location, power, size, color in [
        ((-4, -5, 7), 800, 5, (1, .94, .87)),
        ((3, 2, 6), 1100, 3, (.85, .91, 1)),
        ((4, -3, 3), 260, 4, (1, 1, 1)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(location))
        light = bpy.context.object
        light.data.energy = power
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = args.samples
    # OIDN's external allocations exceed this sandbox's peak memory on some
    # masters. Static 1600px/48-sample renders downsample cleanly without it.
    scene.cycles.use_denoising = False
    scene.cycles.adaptive_threshold = .06
    scene.render.resolution_x = args.size
    scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.world.color = (.22, .22, .22)
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("ORIGINAL_ASSET_COMPLETE", name, args.size, flush=True)
    bpy.data.orphans_purge(do_recursive=True)


black = material("Obsidian sculpture", (.019, .022, .026), .22, .29, .015)
sculpture = material("Satin black basalt", (.026, .028, .031), .08, .48, .02)
dark = material("Cavity black", (.001, .001, .001), 0, .9)
ivory = material("Carved porcelain", (.86, .83, .75), .05, .28, .025)
bone = material("Anatomical bone", (.59, .53, .41), 0, .65, .23)
steel = material("Brushed aluminium", (.39, .42, .45), .93, .26, .045)
rubber = material("Knurled black rubber", (.015, .017, .021), .05, .65, .2)
grey = material("Graphite", (.13, .15, .17), .45, .4)
brass = material("Antique brass", (.49, .28, .095), .7, .28)
glass = material("Coated optical glass", (.012, .035, .055), .5, .13)
screen = material("Camera screen", (.018, .032, .042), .15, .25)
cobalt = material("Cobalt blue enamel", (.015, .16, .53), .25, .23)
red = material("Muted vermilion", (.39, .055, .07), .05, .4)
teal = material("Timeline teal", (.018, .35, .29), .1, .4)
iris = material("Hazel iris", (.14, .19, .12), .05, .35)
green = material("Botanical green", (.07, .16, .08), .05, .4)
petal_mat = material("Salmon lily", (.59, .13, .09), 0, .4)

builders = {"bust": bust, "king": lambda: chess(False), "queen": lambda: chess(True),
            "target": target, "camera": camera, "clock": clock,
            "phone": phone, "laptop": laptop, "eye": eye, "foil": foil, "flowers": flowers}
for name, builder in builders.items():
    if not args.only or name in args.only.split(","):
        studio(name, builder)
