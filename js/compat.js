/* Compatibility rules for the custom PC builder (also used by the home page sample build). */
(function (PCS) {
  'use strict';
  var by = PCS.byId;

  PCS.SLOTS = [
    { id: 'cpu', label: 'Processor', required: true, hint: 'Does the thinking. More cores help with editing and multitasking.' },
    { id: 'motherboard', label: 'Motherboard', required: true, hint: 'Connects every part. Its socket must match the processor.' },
    { id: 'ram', label: 'Memory', required: true, hint: 'Short-term memory. 16 GB is a good start, 32 GB suits editing.' },
    { id: 'gpu', label: 'Graphics card', required: false, hint: 'Draws games and video. Optional if the processor has built-in graphics.' },
    { id: 'ssd', label: 'Storage', required: true, hint: 'Where Windows and your files live. NVMe drives are the fastest.' },
    { id: 'cooler', label: 'CPU cooler', required: false, hint: 'Keeps the processor cool. Optional if your processor includes one.' },
    { id: 'psu', label: 'Power supply', required: true, hint: 'Powers everything. Leave headroom above the estimated load.' },
    { id: 'case', label: 'Cabinet', required: true, hint: 'Holds everything. It must fit the motherboard size.' }
  ];

  function part(sel, slot) { return sel[slot] ? (by[sel[slot]] || null) : null; }
  function ok(text) { return { level: 'ok', text: text }; }
  function warn(text) { return { level: 'warn', text: text }; }
  function err(text) { return { level: 'error', text: text }; }

  PCS.compat = {
    /* Why `cand` cannot be used in `slot` with the current selection, or null if it fits. */
    conflict: function (slot, cand, sel) {
      var cpu = part(sel, 'cpu'), mb = part(sel, 'motherboard'), ram = part(sel, 'ram'), cs = part(sel, 'case');
      var sock;
      switch (slot) {
        case 'cpu':
          if (mb && mb.socket !== cand.socket) return 'Socket ' + cand.socket + ' does not match your ' + mb.socket + ' motherboard';
          break;
        case 'motherboard':
          if (cpu && cpu.socket !== cand.socket) return 'Socket ' + cand.socket + ' does not match your ' + cpu.socket + ' processor';
          if (ram && ram.type !== cand.ramType) return 'Takes ' + cand.ramType + ', but your memory is ' + ram.type;
          if (cs && cs.supports.indexOf(cand.form) === -1) return cand.form + ' board does not fit your cabinet';
          break;
        case 'ram':
          if (mb && mb.ramType !== cand.type) return cand.type + ' does not match your ' + mb.ramType + ' motherboard';
          break;
        case 'cooler':
          sock = (cpu && cpu.socket) || (mb && mb.socket);
          if (sock && cand.sockets.indexOf(sock) === -1) return 'Does not mount on ' + sock;
          break;
        case 'case':
          if (mb && cand.supports.indexOf(mb.form) === -1) return 'Does not hold a ' + mb.form + ' motherboard';
          break;
      }
      return null;
    },

    /* Full report for a selection: { slotId: productId } */
    check: function (sel) {
      var cpu = part(sel, 'cpu'), mb = part(sel, 'motherboard'), ram = part(sel, 'ram'), gpu = part(sel, 'gpu');
      var cool = part(sel, 'cooler'), psu = part(sel, 'psu'), cs = part(sel, 'case');
      var checks = [];

      if (cpu && mb) {
        checks.push(cpu.socket === mb.socket
          ? ok('Processor and motherboard share the ' + cpu.socket + ' socket.')
          : err('The processor is ' + cpu.socket + ' but the motherboard is ' + mb.socket + '.'));
      }
      if (mb && ram) {
        checks.push(mb.ramType === ram.type
          ? ok('Memory is ' + ram.type + ', which the motherboard takes.')
          : err('The motherboard takes ' + mb.ramType + ' but the memory is ' + ram.type + '.'));
      }
      if (mb && cs) {
        checks.push(cs.supports.indexOf(mb.form) !== -1
          ? ok('A ' + mb.form + ' motherboard fits the cabinet.')
          : err('The cabinet cannot hold a ' + mb.form + ' motherboard.'));
      }
      var sock = (cpu && cpu.socket) || (mb && mb.socket);
      if (cool && sock) {
        checks.push(cool.sockets.indexOf(sock) !== -1
          ? ok('The cooler mounts on ' + sock + '.')
          : err('The cooler does not mount on ' + sock + '.'));
      }
      if (cpu && !cool) {
        checks.push(warn('No CPU cooler chosen. Add one unless your processor includes a cooler.'));
      }
      if (cpu) {
        checks.push(gpu || cpu.igpu
          ? ok(gpu ? 'The graphics card provides display output.' : 'The processor has built-in graphics for display output.')
          : err('No display output. This processor has no built-in graphics, so add a graphics card.'));
      }

      /* Rough power estimate: processor + graphics card + 100 W for everything else */
      var watts = cpu ? cpu.tdp + (gpu ? gpu.tdp : 0) + 100 : 0;
      var recommended = watts ? Math.ceil(watts * 1.5 / 50) * 50 : 0;
      if (psu && watts) {
        if (psu.watt < watts * 1.2) {
          checks.push(err(psu.watt + ' W is too small for an estimated ' + watts + ' W load. Choose ' + recommended + ' W or more.'));
        } else if (psu.watt < recommended) {
          checks.push(warn('Headroom is tight. ' + recommended + ' W or more is safer for an estimated ' + watts + ' W load.'));
        } else {
          checks.push(ok(psu.watt + ' W covers the estimated ' + watts + ' W load with room to spare.'));
        }
      }

      var missing = PCS.SLOTS.filter(function (s) { return s.required && !sel[s.id]; }).map(function (s) { return s.label; });
      return {
        checks: checks,
        watts: watts,
        recommended: recommended,
        missing: missing,
        errors: checks.filter(function (c) { return c.level === 'error'; }).length,
        warnings: checks.filter(function (c) { return c.level === 'warn'; }).length
      };
    }
  };
})(window.PCS);
