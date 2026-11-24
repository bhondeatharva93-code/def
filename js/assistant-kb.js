/* ==========================================================================
   Store assistant: general PC knowledge
   Short, plain answers to common "what is" and "which is better" questions.
   Each entry needs: id, re (a regular expression tested against the lower-case
   message), text, and optionally chips (suggested follow-ups) and actions
   (buttons: { label, href }). Add your own entries at the end of the list.
   ========================================================================== */
window.PCS = window.PCS || {};

PCS.kb = [
  {
    id: 'ram-amount',
    re: /how much (ram|memory)|(ram|memory) (do i need|is enough|needed|required|is good|is ok)|\b(8|16|32|64) ?gb (or|vs) (8|16|32|64)/,
    text: 'For everyday use, 8 GB is the minimum and 16 GB is comfortable. Gaming and multitasking suit 16 GB. Video editing, streaming, big spreadsheets and the newest games like 32 GB. Two sticks of memory (dual channel) run faster than one.',
    chips: ['Show RAM kits', 'Best PC for video editing']
  },
  {
    id: 'ddr',
    re: /ddr ?4.*\b(vs|or|versus|difference|better)\b.*ddr ?5|ddr ?5.*\b(vs|or|versus|difference|better)\b.*ddr ?4|difference between ddr/,
    text: 'DDR5 is the newer, faster memory, but it needs a motherboard made for DDR5. DDR4 boards and memory cost less and are plenty for everyday use and 1080p gaming. The two are not interchangeable, so the motherboard decides which one you use.',
    chips: ['Show DDR5 RAM', 'Show DDR4 RAM']
  },
  {
    id: 'ssd-hdd',
    re: /(ssd|solid state).*\b(vs|or|versus|difference|better)\b.*(hdd|hard (disk|drive))|(hdd|hard (disk|drive)).*\b(vs|or|versus|difference|better)\b.*(ssd|solid state)/,
    text: 'An SSD loads Windows, apps and games many times faster than a hard drive and has no moving parts. A hard drive costs less per terabyte, so it suits bulk storage like old videos and backups. A good setup is an SSD for Windows and your apps, plus a hard drive only if you need cheap extra space.',
    chips: ['Show SSDs']
  },
  {
    id: 'nvme-sata',
    re: /nvme.*\b(vs|or|versus|difference|better)\b.*sata|sata.*\b(vs|or|versus|difference|better)\b.*nvme|what is (an )?nvme|what does nvme mean/,
    text: 'NVMe SSDs plug into the M.2 slot on the motherboard and are much faster than SATA SSDs when copying big files or opening large projects. For everyday use you may not notice a difference. For editing and big game libraries NVMe is worth it. Check that your motherboard has an M.2 slot.',
    chips: ['Show NVMe SSDs']
  },
  {
    id: 'amd-intel',
    re: /(amd|ryzen).*\b(vs|or|versus|better|difference)\b.*(intel|core)|(intel|core).*\b(vs|or|versus|better|difference)\b.*(amd|ryzen)/,
    text: 'Both make very good processors. The better one is whichever gives you more performance for your budget right now, so compare the exact models rather than the brands. Also look at the socket: a newer one such as AM5 leaves more room for upgrades later. Tell me what the PC is for and your budget and I will shortlist.',
    chips: ['Show AMD processors', 'Show Intel processors']
  },
  {
    id: 'cores',
    re: /how many cores|cores (do i need|are enough|is enough)/,
    text: 'For gaming and everyday work, 6 cores is a solid base. Video editing, streaming while gaming and heavy multitasking benefit from 8 cores or more. The generation and speed of the processor matter too, so compare exact models rather than core counts alone.',
    chips: ['Show processors']
  },
  {
    id: 'gpu-need',
    re: /(do i need|need a|should i (get|buy)|without a?) ?(graphics|gpu|videocard)|integrated graphics|igpu|built.?in graphics|onboard graphics/,
    text: 'You only need a separate graphics card for gaming, 3D work and heavy video effects. For office, study, trading and everyday use, a processor with built-in graphics, such as the Ryzen 5 5600G, is enough. Check that the processor lists built-in graphics, otherwise the PC has no display output until you add a card.',
    chips: ['Office PC under ₹30,000', 'Show graphics cards']
  },
  {
    id: 'psu-size',
    re: /(how many|how much) (watt|watts|power)|which (psu|power supply)|what (psu|power supply)|(psu|power supply|smps).*(need|enough|size|recommend|watt)/,
    text: 'Add up the processor and graphics card power, add about 100 W for everything else, then choose a power supply about 1.5 times that. A 65 W processor with a 145 W graphics card is roughly 310 W, so around 500 W is comfortable and 650 W leaves room to upgrade. The custom build page runs this check for you.',
    chips: ['Show power supplies'],
    actions: [{ label: 'Open the PC builder', href: 'build.html' }]
  },
  {
    id: 'resolution',
    re: /\b(1080p|1440p|2k|4k|qhd|full hd|fhd|uhd)\b.*\b(vs|or|versus|better|difference)\b|which resolution|refresh rate|how many hz|\b(144|165|180|240) ?hz/,
    text: '1080p suits entry and mid-range graphics cards and 24 inch screens. 1440p (QHD) is a step up that suits a mid-range card and a 27 inch screen. 4K needs a high-end card. For games, a refresh rate of 100 to 165 Hz feels smooth, as long as your graphics card can reach those frame rates.',
    chips: ['Show monitors']
  },
  {
    id: 'panel',
    re: /\b(ips|va|tn|oled)\b.*\b(vs|or|versus|better|difference)\b|which panel|panel type/,
    text: 'IPS panels have the best colours and viewing angles, so they suit editing, office work and most gaming. VA panels have deeper blacks but can smear in fast games. TN panels are fast but have weaker colours. For most people IPS is the safe choice.',
    chips: ['Show monitors']
  },
  {
    id: 'cooling',
    re: /\b(air|fan)\b.*\b(vs|or|versus)\b.*\b(liquid|aio|water)\b|\b(liquid|aio|water)\b.*\b(vs|or|versus)\b.*\b(air|fan)\b/,
    text: 'A good air cooler is quieter, cheaper and has no pump that can fail, and it handles most 65 W processors easily. A liquid cooler (AIO) suits hot, high-power processors and gives a tidier look, but check that the cabinet has room for the radiator.',
    chips: ['Show CPU coolers']
  },
  {
    id: 'form-factor',
    re: /\b(atx|matx|micro ?atx|mini ?itx|itx)\b.*\b(vs|or|versus|difference|size)\b|form factor|what is (an? )?(atx|matx|itx)\b/,
    text: 'These are motherboard sizes. ATX is the largest and has the most slots. Micro-ATX (mATX) is smaller and cheaper and fits most home PCs. Mini-ITX is tiny and suits compact builds. The cabinet must support the size of the motherboard, and the PC builder checks this for you.',
    actions: [{ label: 'Open the PC builder', href: 'build.html' }]
  },
  {
    id: 'socket',
    re: /what is (a |the )?socket|socket (mean|means)|which socket|am4 \b(vs|or)\b am5|am5 \b(vs|or)\b am4/,
    text: 'The socket is the slot on the motherboard that the processor fits into. The processor and the motherboard must use the same socket, for example AM5 with AM5. AM5 is newer than AM4 and takes DDR5 memory. I can check a processor and motherboard pair for you.',
    chips: ['Is Ryzen 5 7600 compatible with B650M board?']
  },
  {
    id: 'tdp',
    re: /\btdp\b/,
    text: 'TDP is roughly how much heat a processor produces, in watts. It helps you pick a cooler and a power supply that can handle it. A 65 W processor runs fine with a basic tower cooler.'
  },
  {
    id: 'vram',
    re: /\bvram\b|how much (video|graphics) memory/,
    text: 'VRAM is the graphics card\'s own memory. 8 GB is fine for 1080p gaming. 12 to 16 GB gives more room for 1440p, detailed textures and 3D or video work.',
    chips: ['Show graphics cards']
  },
  {
    id: 'eighty-plus',
    re: /80 ?\+|80 plus|\bbronze\b|\bgold\b|efficiency rating/,
    text: '80+ is an efficiency rating for power supplies. Bronze, Silver, Gold and so on tell you how little power is wasted as heat. Gold units waste less and usually use better parts. Bronze is fine for most home PCs.',
    chips: ['Show power supplies']
  },
  {
    id: 'ups-need',
    re: /(do i need|need a|should i (buy|get)|why).*\bups\b|\bups\b (for|with) (my )?(pc|computer)|is ups (needed|necessary)/,
    text: 'A UPS keeps your PC running through short power cuts and voltage dips, so you can save your work and shut down safely. It matters most for long renders, trading and places with unstable power. A 600 VA unit covers a single PC. Choose 1100 VA if you also want to run a monitor.',
    chips: ['Show UPS options']
  },
  {
    id: 'bottleneck',
    re: /bottleneck/,
    text: 'A bottleneck means one part holds the others back, for example a very weak processor with a strong graphics card. Keep the parts balanced. For games, spend most on the graphics card but pair it with a modern 6-core processor, 16 GB of RAM and an SSD.'
  },
  {
    id: 'upgrade',
    re: /(easy|easily) (to )?upgrade|upgrade ?path|future ?proof|upgrad(e|able|eable) later|can i upgrade/,
    text: 'To keep upgrades easy, choose a motherboard with a newer socket, a power supply with some spare watts, and a cabinet with room to spare. Memory, storage and the graphics card are the simplest parts to upgrade later. A processor upgrade works only within the same socket.'
  },
  {
    id: 'laptop-pc',
    re: /\b(laptop|notebook)\b.*\b(vs|or|versus|better|difference)\b.*\b(pc|desktop|computer)\b|(pc|desktop).*\b(vs|or|versus|better|difference)\b.*\b(laptop|notebook)\b/,
    text: 'For the same money a desktop is faster and easier to upgrade, and suits a fixed desk. A laptop is portable and has a screen, keyboard and battery built in, which suits students and people who move around. If you need to carry it, choose a laptop.',
    chips: ['Show laptops', 'Best PC for office and study']
  },
  {
    id: 'how-choose',
    re: /how (do|to|can|should) (i|we) (choose|pick|select|buy|decide)|which (pc|computer|laptop) (should|to|is best)|help me (choose|pick|decide|select)|confused|not sure what to (buy|get)/,
    text: 'Start with three things: what the PC is for, your budget, and whether you want a ready-made PC or a custom build. Tell me the first two and I will shortlist options with prices and EMI.',
    chips: ['Gaming PC', 'Video editing PC', 'Trading PC', 'Office and study PC']
  },
  {
    id: 'about-bot',
    re: /what can you do|how can you help|what do you do|who are you|are you (a |an )?(bot|ai|human|real|robot|person)|is this (a )?(bot|ai)/,
    text: 'I am Galaxy AI, an automated assistant for this store, not a person. I can suggest PCs and parts for your budget, compare products, check whether parts fit together, work out EMI, and answer questions about delivery, warranty and returns. For anything else I can pass you to the team on WhatsApp.'
  }
];
