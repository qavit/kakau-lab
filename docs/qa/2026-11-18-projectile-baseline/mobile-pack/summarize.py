import json,sys
d=json.load(open(sys.argv[1]))['results']
for proto,vps in d.items():
  print("#####",proto)
  for k,v in vps.items():
    i,p,e,pr,r=v['initial'],v['paramsOpen'],v['afterEdit'],v['preset'],v['rotation']
    print(f"== {k}\n  initial: canvas {i['canvasPx']} visible {i['canvasVisiblePct']}% top={i['canvasTop']} readout={i['readoutKeyRow']} transport={i['transport']}")
    print(f"  params : canvas {p['canvasPx']} visible {p['canvasVisiblePct']}% speedSliderInVP={p['speedSliderInViewport']} y={p['speedSliderY']} readout={p['readoutKeyRow']} scrollY={p['scrollY']}")
    print(f"  edit   : canvas visible {e['canvasVisiblePct']}% readout={e['readoutKeyRow']}")
    print(f"  preset : clicks={pr['clicksFromFreshLoad']} canvas visible {pr['canvasVisiblePct']}%")
    print(f"  rotate : stateKept={r['stateKept']} panelKept={r['panelKept']} rotated canvas {r['rotated']['canvasPx']} vis {r['rotated']['canvasVisiblePct']}% | back vis {r['back']['canvasVisiblePct']}%")
