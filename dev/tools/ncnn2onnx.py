# Model: realesrgan-x4plus.param/.bin from github.com/xinntao/Real-ESRGAN releases (ncnn zip, v0.2.5.0).
"""Convert an ncnn RRDB model (.param text + .bin raw float weights) into ONNX.
Pure data parsing: the .param is a text layer list, the .bin is raw float32 arrays."""
import sys, numpy as np, onnx
from onnx import helper, TensorProto, numpy_helper
param, binf, dst = sys.argv[1:4]
lines = open(param).read().split('\n')[2:]
blob = np.fromfile(binf, dtype=np.uint8); off = 0
def take(n, flagged):
    global off
    if flagged:
        flag = int(np.frombuffer(blob[off:off+4].tobytes(), '<u4')[0]); off += 4
        if flag == 0x01306B47:  # fp16 weights, padded to 4 bytes
            a = np.frombuffer(blob[off:off+2*n].tobytes(), '<f2').astype(np.float32); off += (2*n + 3) // 4 * 4; return a
        assert flag == 0, hex(flag)
    a = np.frombuffer(blob[off:off+4*n].tobytes(), '<f4').copy(); off += 4*n; return a
alias, nodes, inits, k = {}, [], [], 0
R = lambda n: alias.get(n, n)
def const(name, arr): inits.append(numpy_helper.from_array(np.asarray(arr, np.float32), name)); return name
for ln in lines:
    t = ln.split()
    if not t: continue
    typ, name, ni, no = t[0], t[1], int(t[2]), int(t[3])
    ins, outs = t[4:4+ni], t[4+ni:4+ni+no]
    kv = {}
    for p in t[4+ni+no:]:
        a, b = p.split('='); kv[a] = b
    if typ == 'Input': alias[outs[0]] = 'x'
    elif typ == 'Split':
        for o in outs: alias[o] = R(ins[0])
    elif typ == 'Convolution':
        co, ks, wn = int(kv['0']), int(kv['1']), int(kv['6']); ci = wn // (co*ks*ks)
        w = take(wn, True).reshape(co, ci, ks, ks); b = take(co, False) if kv.get('5') == '1' else np.zeros(co, np.float32)
        out = outs[0] if kv.get('9') != '2' else name + '_pre'
        nodes.append(helper.make_node('Conv', [R(ins[0]), const(name+'_w', w), const(name+'_b', b)], [out], pads=[ks//2]*4))
        if kv.get('9') == '2':
            slope = float(kv['-23310'].split(',')[1])
            nodes.append(helper.make_node('LeakyRelu', [out], [outs[0]], alpha=slope))
    elif typ == 'Concat':
        nodes.append(helper.make_node('Concat', [R(i) for i in ins], [outs[0]], axis=1))
    elif typ == 'Eltwise':
        c = [float(x) for x in kv['-23301'].split(',')[1:]]
        a = name + '_a'; b = name + '_b'
        nodes.append(helper.make_node('Mul', [R(ins[0]), const(name+'_c0', c[0])], [a]))
        nodes.append(helper.make_node('Mul', [R(ins[1]), const(name+'_c1', c[1])], [b]))
        nodes.append(helper.make_node('Add', [a, b], [outs[0]]))
    elif typ == 'BinaryOp':
        nodes.append(helper.make_node('Add', [R(ins[0]), R(ins[1])], [outs[0]]))
    elif typ == 'Interp':
        nodes.append(helper.make_node('Resize', [R(ins[0]), '', const(name+'_s', [1, 1, float(kv['1']), float(kv['2'])])], [outs[0]], mode='nearest'))
    else: raise SystemExit('unknown layer ' + typ)
assert off == blob.size, (off, blob.size)
g = helper.make_graph(nodes, 'rrdb', [helper.make_tensor_value_info('x', TensorProto.FLOAT, [1, 3, None, None])],
                      [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, None, None])], inits)
m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)]); m.ir_version = 8
onnx.checker.check_model(m); onnx.save(m, dst); print('ok', len(nodes), 'nodes')
