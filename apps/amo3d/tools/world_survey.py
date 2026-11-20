#!/usr/bin/env python3
"""Survey a spot in the open world (Eldoria): the standard views and height profiles, as one contact sheet.

usage: python3 tools/world_survey.py <outdir> (--place <stampId> | --at <x>,<z>) [--radius 400] [--name tag]
  needs the dev server on :5190 (npm run dev). Writes <outdir>/<tag>_survey.png and prints the profiles.

Views (each 800x450): four from the ground at `radius` looking at the spot (from S, W, N, E), one aerial from the south,
and one from the spot itself looking south. Profiles: heights every 20 m along W-E and N-S lines through the spot
(2*radius long), so a cliff, a pit or a wall at a place's edge shows in numbers, not only in pictures.
"""
import json, math, os, subprocess, sys

args = sys.argv[1:]
if len(args) < 3:
    print(__doc__); sys.exit(1)
out = os.path.abspath(args[0])
opt = {args[i]: args[i + 1] for i in range(1, len(args) - 1, 2)}
os.makedirs(out, exist_ok=True)
radius = float(opt.get('--radius', 400))
tag = opt.get('--name') or opt.get('--place') or 'spot'
if '--place' in opt:
    where = f"(()=>{{const M=window.__poc.map;const st=M.ensureStamp('{opt['--place']}');return {{x:st.ox,z:st.oz}}}})()"
else:
    x, z = opt['--at'].split(',')
    where = f"({{x:{float(x)},z:{float(z)}}})"

views = [('S', 0, 1), ('W', -1, 0), ('N', 0, -1), ('E', 1, 0)]
steps = [["nav", "http://localhost:5190/?new=1"], ["wait", 3500], ["eval", "window.__poc.title.start?.()"], ["wait", 4000],
         ["eval", f"(()=>{{const P=window.__poc;P.enterMap('eldoria','start');window._spot={where};return 'spot '+JSON.stringify(window._spot)}})()"]]
place = "(ax,az,yaw,pitch,dist)=>{const P=window.__poc,M=P.map;P.player.pos.set(ax,M.heightAt(ax,az),az);P.cam.firstPerson=false;P.cam.yaw=yaw;P.cam.pitch=pitch;P.cam.dist=dist;for(let i=0;i<40;i++)P.advance(0.1);}"
for name, dx, dz in views:
    steps.append(["eval", f"(()=>{{const s=window._spot,ax=s.x+{dx}*{radius},az=s.z+{dz}*{radius};({place})(ax,az,Math.atan2({dx},{dz}),0.12,22);return '{name}'}})()"])
    steps += [["wait", 1200], ["shot", f"{tag}_{name}"]]
steps.append(["eval", f"(()=>{{const s=window._spot,ax=s.x,az=s.z+{radius}*0.6;({place})(ax,az,0,0.55,{radius}*0.7);return 'air'}})()"])
steps += [["wait", 1200], ["shot", f"{tag}_air"]]
steps.append(["eval", f"(()=>{{const s=window._spot;({place})(s.x,s.z,Math.PI,0.15,14);return 'in'}})()"])
steps += [["wait", 1200], ["shot", f"{tag}_in"]]
steps.append(["eval", f"(()=>{{const M=window.__poc.map,s=window._spot,r={radius},o=[];for(const [n,ux,uz] of [['W-E',1,0],['N-S',0,1]]){{const h=[];for(let t=-r;t<=r;t+=20)h.push(Math.round(M.heightAt(s.x+ux*t,s.z+uz*t)));o.push(n+': '+h.join(' '));}}return o.join(' | ')}})()"])

script = os.path.join(out, f'{tag}_survey.json')
json.dump(steps, open(script, 'w'))
tools = os.path.dirname(os.path.abspath(__file__))
res = subprocess.run(['node', os.path.join(tools, 'headless.mjs'), out, json.dumps(steps)], cwd=os.path.dirname(tools), capture_output=True, text=True, timeout=600)
for line in res.stdout.splitlines():
    if line.startswith('[eval] "') or 'rror' in line: print(line)
try:
    from PIL import Image
    names = [f'{tag}_{n}' for n, _, _ in views] + [f'{tag}_air', f'{tag}_in']
    sheet = Image.new('RGB', (1600, 1350))
    for i, n in enumerate(names):
        p = os.path.join(out, n + '.png')
        if os.path.exists(p): sheet.paste(Image.open(p).resize((800, 450)), ((i % 2) * 800, (i // 2) * 450))
    sheet.save(os.path.join(out, f'{tag}_survey.png'))
    print('sheet', os.path.join(out, f'{tag}_survey.png'), '(from S, W / N, E / aerial, inside)')
except ImportError:
    print('PIL missing: shots are in', out)
