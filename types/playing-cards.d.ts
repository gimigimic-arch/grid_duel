// Type declarations for @letele/playing-cards (package ships without .d.ts)
declare module '@letele/playing-cards' {
  import * as React from 'react';
  type C = React.ComponentType<React.SVGProps<SVGSVGElement>>;

  // Spades
  export const S2: C; export const S3: C; export const S4: C; export const S5: C;
  export const S6: C; export const S7: C; export const S8: C; export const S9: C;
  export const S10: C; export const Sj: C; export const Sq: C; export const Sk: C;
  export const Sa: C;

  // Hearts
  export const H2: C; export const H3: C; export const H4: C; export const H5: C;
  export const H6: C; export const H7: C; export const H8: C; export const H9: C;
  export const H10: C; export const Hj: C; export const Hq: C; export const Hk: C;
  export const Ha: C;

  // Diamonds
  export const D2: C; export const D3: C; export const D4: C; export const D5: C;
  export const D6: C; export const D7: C; export const D8: C; export const D9: C;
  export const D10: C; export const Dj: C; export const Dq: C; export const Dk: C;
  export const Da: C;

  // Clubs
  export const C2: C; export const C3: C; export const C4: C; export const C5: C;
  export const C6: C; export const C7: C; export const C8: C; export const C9: C;
  export const C10: C; export const Cj: C; export const Cq: C; export const Ck: C;
  export const Ca: C;

  // Jokers
  export const B1: C; export const B2: C;
}
