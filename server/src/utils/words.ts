const words = [
  // Original words
  'anchor', 'anvil', 'arrow', 'axe', 'barrel', 'bomb', 'cactus', 'candle',
  'castle', 'chest', 'coin', 'crown', 'crystal', 'door', 'flag', 'flame',
  'gem', 'ghost', 'heart', 'key', 'ladder', 'mushroom', 'potion', 'ring',
  'shield', 'skull', 'star', 'sword', 'target', 'tree',
  
  // Animals
  'cat', 'dog', 'fish', 'bird', 'snake', 'frog', 'bear', 'lion', 'tiger',
  'elephant', 'giraffe', 'monkey', 'rabbit', 'turtle', 'butterfly', 'spider',
  'crab', 'octopus', 'shark', 'whale', 'penguin', 'owl', 'eagle', 'duck',
  'horse', 'cow', 'pig', 'sheep', 'chicken',
  
  // Food & Drinks
  'apple', 'banana', 'pizza', 'burger', 'cake', 'cookie', 'ice cream',
  'donut', 'sandwich', 'hot dog', 'fries', 'popcorn', 'chocolate', 'candy',
  'lollipop', 'cupcake', 'watermelon', 'strawberry', 'cherry', 'grape',
  'carrot', 'broccoli', 'corn', 'egg', 'cheese', 'bread', 'pancake',
  'coffee', 'tea', 'juice', 'milk',
  
  // Nature & Weather
  'sun', 'moon', 'cloud', 'rain', 'snow', 'rainbow', 'lightning', 'wind',
  'mountain', 'river', 'ocean', 'wave', 'beach', 'island', 'volcano',
  'flower', 'rose', 'leaf', 'grass', 'forest', 'desert',
  
  // Objects & Items
  'book', 'pen', 'pencil', 'paper', 'scissors', 'glue', 'ruler', 'clock',
  'watch', 'phone', 'computer', 'camera', 'television', 'radio', 'lamp',
  'chair', 'table', 'bed', 'mirror', 'window', 'curtain', 'door',
  'bicycle', 'car', 'bus', 'train', 'airplane', 'helicopter', 'boat', 'ship',
  'balloon', 'kite', 'umbrella', 'backpack', 'suitcase',
  
  // Sports & Games
  'ball', 'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'hockey',
  'football', 'volleyball', 'skateboard', 'surfboard', 'trophy', 'medal',
  'dice', 'cards', 'chess', 'puzzle',
  
  // Clothing & Accessories
  'hat', 'cap', 'glasses', 'sunglasses', 'shoes', 'boots', 'socks',
  'shirt', 'pants', 'dress', 'jacket', 'scarf', 'gloves', 'tie', 'belt',
  'purse', 'wallet', 'watch', 'necklace',
  
  // Body Parts
  'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'leg', 'arm', 'finger',
  'toe', 'hair', 'teeth', 'tongue', 'brain', 'bone',
  
  // Tools & Instruments
  'hammer', 'screwdriver', 'wrench', 'saw', 'drill', 'nail', 'bucket',
  'broom', 'mop', 'shovel', 'rake',
  'guitar', 'piano', 'drum', 'trumpet', 'violin', 'flute', 'microphone',
  
  // Buildings & Places
  'house', 'school', 'hospital', 'church', 'bridge', 'tower', 'fence',
  'garden', 'park', 'playground', 'pool', 'fountain',
  
  // Fantasy & Sci-Fi
  'dragon', 'unicorn', 'wizard', 'witch', 'fairy', 'robot', 'alien',
  'spaceship', 'ufo', 'monster', 'zombie', 'vampire', 'treasure', 'map',
  
  // Music & Art
  'music', 'note', 'paint', 'brush', 'canvas', 'sculpture', 'statue',
  
  // Actions (can be drawn as stick figures doing things)
  'running', 'jumping', 'dancing', 'sleeping', 'eating', 'swimming',
  'flying', 'climbing', 'reading', 'writing',
  
  // Miscellaneous
  'fire', 'water', 'ice', 'smoke', 'bubble', 'spiral', 'zigzag',
  'present', 'gift', 'candle', 'fireworks', 'confetti',
  'toothbrush', 'toothpaste', 'soap', 'towel',
  'envelope', 'stamp', 'mailbox',
  'battery', 'magnet', 'compass', 'telescope', 'microscope',
  'pyramid', 'statue', 'vase', 'pottery'
];

export default words;