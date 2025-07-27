#!/bin/bash

# 应用图标生成脚本
# 从SVG文件生成iOS和Android所需的所有尺寸图标

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查依赖...${NC}"
    
    if ! command -v rsvg-convert &> /dev/null; then
        echo -e "${RED}❌ rsvg-convert 未安装${NC}"
        echo -e "${YELLOW}请安装 librsvg:${NC}"
        echo "  macOS: brew install librsvg"
        echo "  Ubuntu: sudo apt-get install librsvg2-bin"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查完成${NC}"
}

# 生成图标函数
generate_icon() {
    local size=$1
    local output_path=$2
    local svg_path=$3
    
    echo "  📱 生成 ${size}x${size} -> ${output_path}"
    rsvg-convert -w $size -h $size "$svg_path" -o "$output_path"
}

# 生成iOS图标
generate_ios_icons() {
    echo -e "${BLUE}🍎 生成iOS图标...${NC}"
    
    local svg_path="app-icon-preview.svg"
    local ios_path="apps/ios/App/App/Assets.xcassets/AppIcon.appiconset"
    
    if [ ! -f "$svg_path" ]; then
        echo -e "${RED}❌ SVG文件不存在: $svg_path${NC}"
        exit 1
    fi
    
    # 创建目录
    mkdir -p "$ios_path"
    
    # iOS图标尺寸定义
    # iPhone App Icons
    generate_icon 60 "$ios_path/AppIcon-20@3x.png" "$svg_path"
    generate_icon 40 "$ios_path/AppIcon-20@2x.png" "$svg_path"
    generate_icon 20 "$ios_path/AppIcon-20.png" "$svg_path"
    
    generate_icon 87 "$ios_path/AppIcon-29@3x.png" "$svg_path"
    generate_icon 58 "$ios_path/AppIcon-29@2x.png" "$svg_path"
    generate_icon 29 "$ios_path/AppIcon-29.png" "$svg_path"
    
    generate_icon 120 "$ios_path/AppIcon-40@3x.png" "$svg_path"
    generate_icon 80 "$ios_path/AppIcon-40@2x.png" "$svg_path"
    generate_icon 40 "$ios_path/AppIcon-40.png" "$svg_path"
    
    generate_icon 180 "$ios_path/AppIcon-60@3x.png" "$svg_path"
    generate_icon 120 "$ios_path/AppIcon-60@2x.png" "$svg_path"
    generate_icon 60 "$ios_path/AppIcon-60@1x.png" "$svg_path"
    
    # iPad App Icons
    generate_icon 152 "$ios_path/AppIcon-76@2x.png" "$svg_path"
    generate_icon 76 "$ios_path/AppIcon-76.png" "$svg_path"
    generate_icon 167 "$ios_path/AppIcon-83.5@2x.png" "$svg_path"
    
    # App Store Icon
    generate_icon 1024 "$ios_path/AppIcon-1024.png" "$svg_path"
    
    echo -e "${GREEN}✅ iOS图标生成完成${NC}"
}

# 生成Android图标
generate_android_icons() {
    echo -e "${BLUE}🤖 生成Android图标...${NC}"

    local svg_path="app-icon-preview.svg"

    if [ ! -f "$svg_path" ]; then
        echo -e "${RED}❌ SVG文件不存在: $svg_path${NC}"
        exit 1
    fi

    # Android图标路径和尺寸
    local android_paths=(
        "apps/android/app/src/main/res/mipmap-mdpi"
        "apps/android/app/src/main/res/mipmap-hdpi"
        "apps/android/app/src/main/res/mipmap-xhdpi"
        "apps/android/app/src/main/res/mipmap-xxhdpi"
        "apps/android/app/src/main/res/mipmap-xxxhdpi"
    )

    local android_sizes=(48 72 96 144 192)

    for i in "${!android_paths[@]}"; do
        local path="${android_paths[$i]}"
        local size="${android_sizes[$i]}"

        mkdir -p "$path"

        # 生成主图标
        generate_icon $size "$path/ic_launcher.png" "$svg_path"
        generate_icon $size "$path/ic_launcher_round.png" "$svg_path"

        # 生成前景图标（用于自适应图标）
        generate_icon $size "$path/ic_launcher_foreground.png" "$svg_path"
    done

    echo -e "${GREEN}✅ Android图标生成完成${NC}"
}

# 更新iOS Contents.json
update_ios_contents() {
    echo -e "${BLUE}📝 更新iOS Contents.json...${NC}"
    
    local contents_path="apps/ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json"
    
    cat > "$contents_path" << 'EOF'
{
  "images" : [
    {
      "filename" : "AppIcon-20.png",
      "idiom" : "iphone",
      "scale" : "1x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-29.png",
      "idiom" : "iphone",
      "scale" : "1x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-40.png",
      "idiom" : "iphone",
      "scale" : "1x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-60@2x.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "AppIcon-60@3x.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "AppIcon-20.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-20@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "AppIcon-29.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-29@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "AppIcon-40.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-40@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "AppIcon-76.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "76x76"
    },
    {
      "filename" : "AppIcon-76@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "76x76"
    },
    {
      "filename" : "AppIcon-83.5@2x.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "83.5x83.5"
    },
    {
      "filename" : "AppIcon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF
    
    echo -e "${GREEN}✅ iOS Contents.json 更新完成${NC}"
}

# 主函数
main() {
    echo -e "${GREEN}🚀 开始生成应用图标...${NC}"
    
    # 检查是否在正确的目录
    if [ ! -f "app-icon-preview.svg" ]; then
        echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
        exit 1
    fi
    
    check_dependencies
    generate_ios_icons
    update_ios_contents
    generate_android_icons
    
    echo -e "${GREEN}🎉 应用图标生成完成！${NC}"
    echo -e "${YELLOW}📋 后续操作：${NC}"
    echo "1. 在Xcode中检查图标是否正确显示"
    echo "2. 在Android Studio中检查图标是否正确显示"
    echo "3. 重新构建应用进行测试"
}

# 运行主函数
main "$@"
