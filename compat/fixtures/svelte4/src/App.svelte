<script>
  import { decodeSet } from 'flickering-dots';
  import { defineDotsElement } from 'flickering-dots/element';

  defineDotsElement();
  const set = decodeSet({"version":1,"id":"pulse","name":"Thinking Pulse","grid":[7,7],"transition":"flip","encoding":"rows-bitmask-msb-left","states":{"idle":{"durations":[1500,420],"frames":[[0,0,0,8,0,0,0],[0,0,0,0,0,0,0]]},"thinking":{"durations":[480,80,80,400,80,80],"frames":[[0,0,0,8,0,0,0],[0,0,8,28,8,0,0],[0,42,28,62,28,42,0],[73,42,28,127,28,42,73],[0,42,28,62,28,42,0],[0,0,8,28,8,0,0]]},"success":{"durations":[80,45,45,45,45,1500],"frames":[[0,0,0,0,0,0,0],[0,0,0,0,32,0,0],[0,0,0,0,32,16,0],[0,0,0,0,40,16,0],[0,0,0,4,40,16,0],[0,0,2,4,40,16,0]]},"error":{"durations":[40,40,40,40,40,40,40,40,60,60,60,60,1500],"frames":[[0,32,0,0,0,0,0],[0,32,16,0,0,0,0],[0,32,16,8,0,0,0],[0,32,16,8,4,0,0],[0,32,16,8,4,2,0],[0,34,16,8,4,2,0],[0,34,20,8,4,2,0],[0,34,20,8,20,2,0],[0,34,20,8,20,34,0],[0,68,40,16,40,68,0],[0,34,20,8,20,34,0],[0,17,10,4,10,17,0],[0,34,20,8,20,34,0]]}},"tags":["pulse","asterisk","chat"],"author":"Flickering Dots"});
</script>

<flickering-dots {set} state="thinking" size="48"></flickering-dots>
