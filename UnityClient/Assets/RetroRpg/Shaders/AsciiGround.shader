Shader "RetroRpg/AsciiGround"
{
    SubShader
    {
        Tags { "Queue"="Geometry" "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color : COLOR;
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                fixed4 color : COLOR;
                float2 world : TEXCOORD0;
            };

            v2f vert(appdata input)
            {
                v2f output;
                output.vertex = UnityObjectToClipPos(input.vertex);
                output.world = mul(unity_ObjectToWorld, input.vertex).xy;
                output.color = input.color;
                return output;
            }

            fixed4 frag(v2f input) : SV_Target
            {
                float pulse = 0.93 + 0.07 * sin(_Time.y * 0.35 + input.world.x * 0.12 + input.world.y * 0.09);
                float grain = frac(sin(dot(input.world, float2(12.9898, 78.233))) * 43758.5453);
                return fixed4(input.color.rgb * (pulse + grain * 0.025), 1.0);
            }
            ENDCG
        }
    }
}
